import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { checkEventConflicts } from '@/services/conflictEngine';
import { getServerUser } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  ErrorCodes,
  EventStatus,
  UserRole,
} from '@/lib/constants';

// GET /api/events - List and search/filter events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const status = searchParams.get('status');
    const venue = searchParams.get('venue');
    const query = searchParams.get('query');

    // Server-verified user session (never trust client-supplied role)
    const user = await getServerUser(request);
    const userRole = user?.role || UserRole.MEMBER;

    let events = await dbService.getEvents();

    // RBAC VISIBILITY ENFORCEMENT:
    // - Members / Unauthenticated: can ONLY see APPROVED events
    // - Club Executives: can see all APPROVED events + their OWN club's pending proposals
    // - ACM Core: can see all events across all clubs
    if (userRole === UserRole.MEMBER) {
      events = events.filter((e: any) => e.status === EventStatus.APPROVED);
    } else if (userRole === UserRole.CLUB_EXEC) {
      events = events.filter(
        (e: any) =>
          e.status === EventStatus.APPROVED ||
          (user?.clubId && e.clubId === user.clubId)
      );
    }

    if (status && status !== 'ALL') {
      events = events.filter((e: any) => e.status === status);
    }
    if (clubId) {
      events = events.filter((e: any) => e.clubId === clubId);
    }
    if (venue) {
      events = events.filter((e: any) => e.venue?.toLowerCase().includes(venue.toLowerCase()));
    }
    if (query) {
      const q = query.toLowerCase();
      events = events.filter(
        (e: any) =>
          e.title?.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q) ||
          (e.club?.name && e.club.name.toLowerCase().includes(q))
      );
    }

    return apiSuccess(events);
  } catch (error: any) {
    console.error('GET /api/events error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch events', 500);
  }
}

// POST /api/events - Create new event proposal & trigger conflict detection
export async function POST(request: NextRequest) {
  try {
    // 1. Server-side session verification
    const user = await getServerUser(request);
    if (!user) {
      return apiError(
        ErrorCodes.UNAUTHORIZED,
        'Authentication required. Please sign in to submit event proposals.',
        401
      );
    }

    // 2. RBAC: Only Club Executives and ACM Core can submit proposals
    if (user.role !== UserRole.CLUB_EXEC && user.role !== UserRole.CORE_VERIFIER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Regular members cannot submit events. Only Club Executives and Core Verifiers are permitted.',
        403
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      clubId,
      startTime,
      endTime,
      venue,
      audienceTags,
      expectedAttendance,
      category,
      eventType,
      estimatedCost,
      organizer,
    } = body;

    // 3. Strict Server-Side Input Validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Event title is required.', 400);
    }
    if (title.trim().length > 100) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Event title cannot exceed 100 characters.', 400);
    }

    if (description && (typeof description !== 'string' || description.trim().length > 1000)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Description cannot exceed 1000 characters.', 400);
    }

    if (!venue || typeof venue !== 'string' || !venue.trim()) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Venue is required.', 400);
    }
    if (venue.trim().length > 100) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Venue cannot exceed 100 characters.', 400);
    }

    // Club ID assignment: Executives can strictly submit ONLY for their assigned club
    let targetClubId = clubId;
    if (user.role === UserRole.CLUB_EXEC) {
      if (!user.clubId) {
        return apiError(ErrorCodes.FORBIDDEN, 'Your executive account is not linked to any registered club.', 403);
      }
      if (clubId && clubId !== user.clubId) {
        return apiError(
          ErrorCodes.FORBIDDEN,
          'Access Denied: You are only authorized to create and submit events for your own club.',
          403
        );
      }
      targetClubId = user.clubId;
    }
    if (!targetClubId) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Organizing club is required.', 400);
    }

    // Date validation
    if (!startTime || !endTime) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Start time and end time are required.', 400);
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return apiError(ErrorCodes.INVALID_EVENT_TIME, 'Invalid date or time format.', 400);
    }
    if (end <= start) {
      return apiError(ErrorCodes.INVALID_EVENT_TIME, 'End time must be strictly after start time.', 400);
    }

    // Number validation
    const costNum = Number(estimatedCost);
    if (estimatedCost === undefined || estimatedCost === null || isNaN(costNum) || costNum < 0) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Estimated Cost (₹) is required and must be minimum 0.', 400);
    }

    let parsedAttendance = 50;
    if (expectedAttendance !== undefined && expectedAttendance !== null) {
      const attNum = parseInt(expectedAttendance, 10);
      if (isNaN(attNum) || attNum < 0 || attNum > 100000) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Expected attendance must be a valid non-negative number.', 400);
      }
      parsedAttendance = attNum;
    }

    const tags = Array.isArray(audienceTags) && audienceTags.length > 0
      ? audienceTags.map((t: any) => String(t).slice(0, 50))
      : ['ALL_STUDENTS'];

    const finalEventType = (eventType || category || 'Workshop').slice(0, 50);
    const finalOrganizer = organizer ? String(organizer).trim().slice(0, 100) : user.name;

    // 4. Create the event with PENDING status linked to verified user
    const createdEvent = await dbService.createEvent({
      title: title.trim(),
      description: description ? description.trim() : null,
      clubId: targetClubId,
      startTime: start,
      endTime: end,
      venue: venue.trim(),
      audienceTags: tags,
      expectedAttendance: parsedAttendance,
      category: finalEventType,
      eventType: finalEventType,
      estimatedCost: costNum,
      organizer: finalOrganizer,
      status: EventStatus.PENDING,
      submittedById: user.id,
    });

    // 5. Trigger Conflict Detection Engine
    let conflictResult: any = { hasConflict: false, flags: [], conflicts: [] };
    try {
      conflictResult = await checkEventConflicts({
        startTime: start,
        endTime: end,
        venue: venue.trim(),
        audienceTags: tags,
        excludeEventId: createdEvent.id,
        createRecordsIfEventId: createdEvent.id,
      });
    } catch (conflictErr) {
      console.error('Non-blocking conflict detection error:', conflictErr);
    }

    const refreshedEvent = (await dbService.getEventById(createdEvent.id)) || createdEvent;

    // 6. Generate ACM Core Notifications
    try {
      const clubName = refreshedEvent.club?.name || 'Club';

      // (3) Any new proposal is submitted, as a lower-priority item
      await dbService.createNotification({
        message: `New proposal submitted: ${refreshedEvent.title} by ${clubName}`,
        eventId: refreshedEvent.id,
        priority: 'LOW',
        type: 'NEW_PROPOSAL',
      });

      // (1) A new proposal is submitted with at least one conflict flag
      if (conflictResult.hasConflict && conflictResult.conflicts?.length > 0) {
        for (const c of conflictResult.conflicts) {
          const reasonLabel = c.conflictType === 'venue conflict' ? 'same venue' : 'same audience';
          await dbService.createNotification({
            message: `New conflict: ${refreshedEvent.title} overlaps ${c.conflictingEventTitle} (${reasonLabel})`,
            eventId: refreshedEvent.id,
            priority: 'HIGH',
            type: 'CONFLICT_PROPOSAL',
          });

          // (2) A pending event gets a new conflict because another event was added
          if (c.conflictingEventId) {
            const conflictingEvent = await dbService.getEventById(c.conflictingEventId);
            if (conflictingEvent && conflictingEvent.status === 'PENDING') {
              await dbService.createNotification({
                message: `New conflict: ${c.conflictingEventTitle} overlaps ${refreshedEvent.title} (${reasonLabel})`,
                eventId: conflictingEvent.id,
                priority: 'HIGH',
                type: 'NEW_CONFLICT',
              });
            }
          }
        }
      }
    } catch (notifErr) {
      console.error('Non-blocking notification error:', notifErr);
    }

    return apiSuccess(
      {
        event: refreshedEvent,
        hasConflict: conflictResult.hasConflict,
        flags: conflictResult.flags || [],
        conflictsCount: conflictResult.conflicts?.length || 0,
        conflicts: conflictResult.conflicts || [],
      },
      201
    );
  } catch (error: any) {
    console.error('POST /api/events error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to create event', 500);
  }
}
