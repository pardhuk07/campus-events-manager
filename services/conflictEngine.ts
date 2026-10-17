import { query } from '@/lib/db';
import { dbService } from '@/lib/dbService';
import { detectConflicts, DetectedConflict } from '@/lib/conflictDetector';

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
  flags: string[];
  conflicts: DetectedConflict[];
}

/**
 * PERSON 2 - CONFLICT DETECTION ENGINE
 * 
 * Rules:
 * 1. Compare candidate proposal with all pending and approved events.
 * 2. Flag an 'audience conflict' if time ranges overlap (startA < endB and startB < endA)
 *    AND target groups overlap, regardless of venue.
 * 3. Flag a separate 'venue conflict' if venue matches and times overlap.
 * 4. Back-to-back events must not conflict.
 * 5. Show each one formatted as: 'Overlaps with <event>, <time>, <reason>'
 *    where <reason> is 'venue conflict' or 'audience conflict'.
 * 6. Never auto-reject: store the flags on the event.
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

  // Query all active pending and approved events from the database
  const whereClauses: string[] = [
    `e.status IN ('PENDING', 'APPROVED', 'FLAGGED_CONFLICT')`,
  ];
  const queryParams: any[] = [];

  const targetEventId = excludeEventId || createRecordsIfEventId;
  if (targetEventId) {
    whereClauses.push(`e.id != $1`);
    queryParams.push(targetEventId);
  }

  const sql = `
    SELECT e.*, c.name as "clubName"
    FROM "Event" e
    LEFT JOIN "Club" c ON e."clubId" = c.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY e."startTime" ASC
  `;

  const existingEvents = await query(sql, queryParams);

  // Run pure conflict detection
  const candidate = {
    id: targetEventId,
    title: '',
    startTime,
    endTime,
    venue,
    audienceTags,
  };

  const conflicts = detectConflicts(candidate, existingEvents);
  const flags = conflicts.map((c) => c.reason);

  // If createRecordsIfEventId is passed, store the flags on the event and insert into EventConflict
  if (createRecordsIfEventId) {
    try {
      await dbService.setEventConflictFlags(createRecordsIfEventId, flags);
      await dbService.replaceEventConflicts(createRecordsIfEventId, conflicts);
    } catch (dbErr) {
      console.error('Failed to store conflict records on event:', dbErr);
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    flags,
    conflicts,
  };
}
