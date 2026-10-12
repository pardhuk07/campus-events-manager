import { query } from '@/lib/db';
import { dbService } from '@/lib/dbService';
import { ConflictStatus, EventStatus } from '@/lib/constants';

export interface ConflictCheckParams {
  startTime: Date;
  endTime: Date;
  venue: string;
  audienceTags: string[];
  excludeEventId?: string;
  createRecordsIfEventId?: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Array<{
    eventId?: string;
    conflictingEventId?: string;
    conflictingEventTitle: string;
    clubName: string;
    reason: string;
    overlapStart: Date;
    overlapEnd: Date;
    conflictType: 'VENUE_TIME' | 'AUDIENCE_TIME';
  }>;
}

/**
 * PERSON 2 - CONFLICT DETECTION ENGINE
 * Detects potential conflicts based on:
 * 1. Time overlap + Venue overlap (hard physical clash)
 * 2. Time overlap + Audience overlap (audience cannibalization)
 *
 * IMPORTANT RULE:
 * The system only FLAGS the conflict. It must NOT automatically cancel/reject the event.
 * Human administrators (ACM Core / CORE_VERIFIER) make the final decision.
 */
export async function checkEventConflicts(params: ConflictCheckParams): Promise<ConflictResult> {
  const {
    startTime,
    endTime,
    venue,
    audienceTags,
    excludeEventId,
    createRecordsIfEventId,
  } = params;

  // Find all active events whose time overlaps:
  // e.startTime < params.endTime AND e.endTime > params.startTime
  const whereClauses: string[] = [
    `e.status IN ('PENDING', 'APPROVED')`,
    `e."startTime" < $1`,
    `e."endTime" > $2`,
  ];
  const queryParams: any[] = [endTime, startTime];

  if (excludeEventId) {
    whereClauses.push(`e.id != $3`);
    queryParams.push(excludeEventId);
  }

  const sql = `
    SELECT e.*, c.name as "clubName"
    FROM "Event" e
    JOIN "Club" c ON e."clubId" = c.id
    WHERE ${whereClauses.join(' AND ')}
  `;

  const overlappingEvents = await query(sql, queryParams);

  const conflicts: ConflictResult['conflicts'] = [];

  for (const existing of overlappingEvents) {
    const existingStart = new Date(existing.startTime);
    const existingEnd = new Date(existing.endTime);

    // Calculate actual overlap window
    const overlapStart = new Date(Math.max(startTime.getTime(), existingStart.getTime()));
    const overlapEnd = new Date(Math.min(endTime.getTime(), existingEnd.getTime()));

    // 1. Check Venue Overlap
    const isSameVenue = existing.venue.trim().toLowerCase() === venue.trim().toLowerCase();
    if (isSameVenue) {
      const reason = `Venue clash at '${existing.venue}': Already reserved for '${existing.title}' (${existing.clubName}).`;
      conflicts.push({
        eventId: createRecordsIfEventId,
        conflictingEventId: existing.id,
        conflictingEventTitle: existing.title,
        clubName: existing.clubName,
        reason,
        overlapStart,
        overlapEnd,
        conflictType: 'VENUE_TIME',
      });

      // Persist conflict record in EventConflict table if primary event exists
      if (createRecordsIfEventId && createRecordsIfEventId !== existing.id) {
        await dbService.createConflictRecord({
          eventId: createRecordsIfEventId,
          conflictingEventId: existing.id,
          reason,
          overlapStart,
          overlapEnd,
          status: ConflictStatus.FLAGGED,
        });
      }
      continue; // Move to next event once flagged
    }

    // 2. Check Audience Overlap
    const existingTags: string[] = existing.audienceTags || [];
    const incomingTags: string[] = audienceTags || [];

    const hasCommonAudience =
      incomingTags.includes('ALL_STUDENTS') ||
      existingTags.includes('ALL_STUDENTS') ||
      incomingTags.some((tag) => existingTags.includes(tag));

    if (hasCommonAudience) {
      const matchedTags = incomingTags.filter((t) => existingTags.includes(t));
      const reason = `Audience overlap: Potential attendance clash with '${existing.title}' (${existing.clubName}) targeting [${matchedTags.length > 0 ? matchedTags.join(', ') : 'Campus Students'}].`;

      conflicts.push({
        eventId: createRecordsIfEventId,
        conflictingEventId: existing.id,
        conflictingEventTitle: existing.title,
        clubName: existing.clubName,
        reason,
        overlapStart,
        overlapEnd,
        conflictType: 'AUDIENCE_TIME',
      });

      if (createRecordsIfEventId && createRecordsIfEventId !== existing.id) {
        await dbService.createConflictRecord({
          eventId: createRecordsIfEventId,
          conflictingEventId: existing.id,
          reason,
          overlapStart,
          overlapEnd,
          status: ConflictStatus.FLAGGED,
        });
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}
