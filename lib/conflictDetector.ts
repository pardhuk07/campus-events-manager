export interface EventItem {
  id?: string;
  title: string;
  startTime: Date | string;
  endTime: Date | string;
  venue: string;
  audienceTags?: string[];
  status?: string;
  clubName?: string;
}

export interface DetectedConflict {
  eventId?: string;
  conflictingEventId?: string;
  conflictingEventTitle: string;
  clubName?: string;
  conflictType: 'venue conflict' | 'audience conflict';
  time: string;
  reason: string;
  overlapStart: Date;
  overlapEnd: Date;
}

/**
 * Formats a time range as standard 12-hour format e.g. "10:00 AM - 12:00 PM"
 */
export function formatConflictTime(startTime: Date | string, endTime: Date | string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const startStr = start.toLocaleTimeString('en-US', timeOptions);
  const endStr = end.toLocaleTimeString('en-US', timeOptions);

  return `${startStr} - ${endStr}`;
}

/**
 * Evaluates whether two event intervals overlap in time:
 * Strict condition: (startA < endB and startB < endA)
 * 
 * NOTE: Back-to-back events (e.g. 10:00-11:00 and 11:00-12:00) have startB === endA,
 * which evaluates to FALSE under strict inequality, so back-to-back events do not conflict.
 */
export function doTimesOverlap(
  startA: Date | string | number,
  endA: Date | string | number,
  startB: Date | string | number,
  endB: Date | string | number
): boolean {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  return sA < eB && sB < eA;
}

/**
 * Checks whether two venues match (case-insensitive, trimmed)
 */
export function doVenuesMatch(venueA?: string | null, venueB?: string | null): boolean {
  if (!venueA || !venueB) return false;
  return venueA.trim().toLowerCase() === venueB.trim().toLowerCase();
}

/**
 * Checks whether target groups overlap.
 * Returns true if both share at least one tag or either targets 'ALL_STUDENTS'.
 */
export function doAudiencesOverlap(tagsA: string[] = [], tagsB: string[] = []): boolean {
  if (!tagsA || !tagsB || tagsA.length === 0 || tagsB.length === 0) {
    return false;
  }

  const normA = tagsA.map((t) => t.trim().toLowerCase());
  const normB = tagsB.map((t) => t.trim().toLowerCase());

  // Check if either targets ALL_STUDENTS or ALL (representing all campus students)
  const isAllA = normA.includes('all_students') || normA.includes('all');
  const isAllB = normB.includes('all_students') || normB.includes('all');
  if (isAllA || isAllB) {
    return true;
  }

  // Check for common target groups
  return normA.some((tagA) => normB.includes(tagA));
}

/**
 * Pure conflict detection engine.
 * 
 * Rules:
 * 1. Compare candidate proposal with all pending and approved events (ignore rejected, cancelled, and self).
 * 2. Flag an 'audience conflict' if time ranges overlap (startA < endB and startB < endA)
 *    AND target groups overlap, regardless of venue.
 * 3. Flag a separate 'venue conflict' if venue matches and times overlap.
 * 4. Back-to-back events must not conflict.
 * 5. Show each one formatted as: 'Overlaps with <event>, <time>, <reason>'
 *    where <reason> is 'venue conflict' or 'audience conflict'.
 * 6. Never auto-reject: simply return the detected conflict flags.
 */
export function detectConflicts(
  candidate: EventItem,
  existingEvents: EventItem[]
): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];

  const candidateStart = new Date(candidate.startTime);
  const candidateEnd = new Date(candidate.endTime);

  // Compare candidate only with active pending and approved events
  const relevantEvents = existingEvents.filter((ev) => {
    // Ignore self when editing
    if (candidate.id && ev.id && candidate.id === ev.id) {
      return false;
    }
    // Only pending and approved events
    const status = (ev.status || 'PENDING').toUpperCase();
    return status === 'PENDING' || status === 'APPROVED' || status === 'FLAGGED_CONFLICT';
  });

  for (const existing of relevantEvents) {
    const existingStart = new Date(existing.startTime);
    const existingEnd = new Date(existing.endTime);

    // 1. Time overlap check: (startA < endB and startB < endA)
    const timesOverlap = doTimesOverlap(candidateStart, candidateEnd, existingStart, existingEnd);
    if (!timesOverlap) {
      // Back-to-back and non-overlapping events do not conflict
      continue;
    }

    const timeStr = formatConflictTime(existingStart, existingEnd);
    const overlapStart = new Date(Math.max(candidateStart.getTime(), existingStart.getTime()));
    const overlapEnd = new Date(Math.min(candidateEnd.getTime(), existingEnd.getTime()));

    // 2. Separate Venue Conflict: venue matches AND times overlap
    const venueMatches = doVenuesMatch(candidate.venue, existing.venue);
    if (venueMatches) {
      const reason = `Overlaps with ${existing.title}, ${timeStr}, venue conflict`;
      conflicts.push({
        eventId: candidate.id,
        conflictingEventId: existing.id,
        conflictingEventTitle: existing.title,
        clubName: existing.clubName,
        conflictType: 'venue conflict',
        time: timeStr,
        reason,
        overlapStart,
        overlapEnd,
      });
    }

    // 3. Separate Audience Conflict: target groups overlap AND times overlap (regardless of venue)
    const audiencesOverlap = doAudiencesOverlap(candidate.audienceTags, existing.audienceTags);
    if (audiencesOverlap) {
      const reason = `Overlaps with ${existing.title}, ${timeStr}, audience conflict`;
      conflicts.push({
        eventId: candidate.id,
        conflictingEventId: existing.id,
        conflictingEventTitle: existing.title,
        clubName: existing.clubName,
        conflictType: 'audience conflict',
        time: timeStr,
        reason,
        overlapStart,
        overlapEnd,
      });
    }
  }

  return conflicts;
}
