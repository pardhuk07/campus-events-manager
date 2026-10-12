import { NextRequest } from 'next/server';
import { checkEventConflicts } from '@/services/conflictEngine';
import { query } from '@/lib/db';
import { apiSuccess, apiError, ErrorCodes } from '@/lib/constants';

// POST /api/conflicts/check - Perform real-time pre-submission check for time/venue/audience overlaps
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startTime, endTime, venue, audienceTags, excludeEventId } = body;

    if (!startTime || !endTime || !venue) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'startTime, endTime, and venue are required for conflict checking.'
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return apiError(ErrorCodes.INVALID_EVENT_TIME, 'End time must be after start time.');
    }

    const tags = Array.isArray(audienceTags) ? audienceTags : ['ALL_STUDENTS'];

    const report = await checkEventConflicts({
      startTime: start,
      endTime: end,
      venue: venue.trim(),
      audienceTags: tags,
      excludeEventId,
    });

    // Provide suggested alternative free slots on the same day for this venue
    const dayStart = new Date(start);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(start);
    dayEnd.setHours(21, 0, 0, 0);

    const dayEvents = await query(
      `SELECT * FROM "Event"
       WHERE venue = $1 AND status IN ('PENDING', 'APPROVED')
         AND "startTime" >= $2 AND "startTime" < $3
       ORDER BY "startTime" ASC`,
      [venue.trim(), dayStart, dayEnd]
    );

    const durationMs = end.getTime() - start.getTime();
    const suggestedSlots: Array<{ start: string; end: string; label: string }> = [];

    let cursor = dayStart.getTime();
    for (const ev of dayEvents) {
      const evStart = new Date(ev.startTime).getTime();
      const evEnd = new Date(ev.endTime).getTime();

      if (evStart - cursor >= durationMs) {
        const s = new Date(cursor);
        const e = new Date(cursor + durationMs);
        suggestedSlots.push({
          start: s.toISOString(),
          end: e.toISOString(),
          label: `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
      }
      cursor = Math.max(cursor, evEnd);
    }

    if (dayEnd.getTime() - cursor >= durationMs) {
      const s = new Date(cursor);
      const e = new Date(cursor + durationMs);
      suggestedSlots.push({
        start: s.toISOString(),
        end: e.toISOString(),
        label: `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });
    }

    return apiSuccess({
      hasConflict: report.hasConflict,
      conflicts: report.conflicts,
      suggestedSlots: suggestedSlots.slice(0, 3),
    });
  } catch (error: any) {
    console.error('POST /api/conflicts/check error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Conflict check failed', 500);
  }
}
