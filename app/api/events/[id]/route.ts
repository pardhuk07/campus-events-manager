import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { getServerUser } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  ErrorCodes,
  EventStatus,
  UserRole,
} from '@/lib/constants';

// GET /api/events/:id - Event details with club, expenses, and conflicts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getServerUser(request);
    const userRole = user?.role || UserRole.MEMBER;

    const event = await dbService.getEventById(id);
    if (!event) {
      return apiError(ErrorCodes.EVENT_NOT_FOUND, 'Event not found with provided ID.', 404);
    }

    // RBAC: If event is not APPROVED, only ACM Core or organizing Club Executive can view it
    if (event.status !== EventStatus.APPROVED) {
      const isCore = userRole === UserRole.CORE_VERIFIER;
      const isClubOwner = userRole === UserRole.CLUB_EXEC && user?.clubId && event.clubId === user.clubId;
      if (!isCore && !isClubOwner) {
        return apiError(ErrorCodes.EVENT_NOT_FOUND, 'Event is not approved for public viewing.', 404);
      }
    }

    return apiSuccess(event);
  } catch (error: any) {
    console.error('GET /api/events/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}

// PATCH /api/events/:id - Update event details or update status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getServerUser(request);
    if (!user) {
      return apiError(ErrorCodes.UNAUTHORIZED, 'Authentication required to modify events.', 401);
    }

    if (user.role === UserRole.MEMBER) {
      return apiError(ErrorCodes.FORBIDDEN, 'Members are not authorized to edit events.', 403);
    }

    const existingEvent = await dbService.getEventById(id);
    if (!existingEvent) {
      return apiError(ErrorCodes.EVENT_NOT_FOUND, 'Event not found with provided ID.', 404);
    }

    const body = await request.json();
    const { status, title, description, venue, startTime, endTime, audienceTags, expectedAttendance, category } = body;

    // RBAC RULES:
    // Executives can only edit their own club's pending/reschedule proposals
    if (user.role === UserRole.CLUB_EXEC) {
      if (user.clubId && existingEvent.clubId !== user.clubId) {
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden: You can only edit proposals belonging to your club.', 403);
      }
      if (existingEvent.status !== EventStatus.PENDING && existingEvent.status !== EventStatus.RESCHEDULE_REQUESTED) {
        return apiError(
          ErrorCodes.FORBIDDEN,
          'Forbidden: Club Executives can only edit proposals that are pending or need rescheduling.',
          403
        );
      }
      if (status && status !== existingEvent.status) {
        return apiError(
          ErrorCodes.FORBIDDEN,
          'Forbidden: Only ACM Core can alter event approval statuses.',
          403
        );
      }
    }

    // Status review can ONLY be executed by CORE_VERIFIER
    if (status && status !== existingEvent.status) {
      if (user.role !== UserRole.CORE_VERIFIER) {
        return apiError(
          ErrorCodes.FORBIDDEN,
          'Only ACM Core / CORE_VERIFIER can approve, reject, or update event statuses.',
          403
        );
      }
      if (!Object.values(EventStatus).includes(status)) {
        return apiError(ErrorCodes.VALIDATION_ERROR, `Invalid event status: ${status}.`, 400);
      }
    }

    // Input Validation
    const updates: any = {};
    if (status) updates.status = status;

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim() || title.trim().length > 100) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Title must be between 1 and 100 characters.', 400);
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      if (description && (typeof description !== 'string' || description.trim().length > 1000)) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Description cannot exceed 1000 characters.', 400);
      }
      updates.description = description ? description.trim() : null;
    }

    if (venue !== undefined) {
      if (typeof venue !== 'string' || !venue.trim() || venue.trim().length > 100) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Venue must be between 1 and 100 characters.', 400);
      }
      updates.venue = venue.trim();
    }

    let finalStart = new Date(existingEvent.startTime);
    let finalEnd = new Date(existingEvent.endTime);

    if (startTime !== undefined) {
      const s = new Date(startTime);
      if (isNaN(s.getTime())) {
        return apiError(ErrorCodes.INVALID_EVENT_TIME, 'Invalid startTime format.', 400);
      }
      finalStart = s;
      updates.startTime = s;
    }

    if (endTime !== undefined) {
      const e = new Date(endTime);
      if (isNaN(e.getTime())) {
        return apiError(ErrorCodes.INVALID_EVENT_TIME, 'Invalid endTime format.', 400);
      }
      finalEnd = e;
      updates.endTime = e;
    }

    if (finalEnd <= finalStart) {
      return apiError(ErrorCodes.INVALID_EVENT_TIME, 'End time must be strictly after start time.', 400);
    }

    if (audienceTags !== undefined) {
      if (!Array.isArray(audienceTags)) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'audienceTags must be an array.', 400);
      }
      updates.audienceTags = audienceTags.map((t: any) => String(t).slice(0, 50));
    }

    if (expectedAttendance !== undefined) {
      const att = Number(expectedAttendance);
      if (isNaN(att) || att < 0 || att > 100000) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'expectedAttendance must be a non-negative number.', 400);
      }
      updates.expectedAttendance = att;
    }

    if (category !== undefined) {
      updates.category = String(category).slice(0, 50);
    }

    const updatedEvent = await dbService.updateEvent(id, updates);

    // Conflict Detection on Proposal Edit
    let conflictResult: any = { hasConflict: false, flags: [], conflicts: [] };
    const finalVenue = updates.venue || existingEvent.venue;
    const finalTags = updates.audienceTags || existingEvent.audienceTags || ['ALL_STUDENTS'];

    try {
      const { checkEventConflicts } = await import('@/services/conflictEngine');
      conflictResult = await checkEventConflicts({
        startTime: finalStart,
        endTime: finalEnd,
        venue: finalVenue,
        audienceTags: finalTags,
        excludeEventId: id,
        createRecordsIfEventId: id,
      });
    } catch (conflictErr) {
      console.error('Conflict detection error on edit:', conflictErr);
    }

    const refreshedEvent = (await dbService.getEventById(id)) || updatedEvent;

    // Generate ACM Core Notifications for conflicts resulting from edit
    try {
      if (conflictResult.hasConflict && conflictResult.conflicts?.length > 0) {
        for (const c of conflictResult.conflicts) {
          const reasonLabel = c.conflictType === 'venue conflict' ? 'same venue' : 'same audience';
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
          if (refreshedEvent.status === 'PENDING') {
            await dbService.createNotification({
              message: `New conflict: ${refreshedEvent.title} overlaps ${c.conflictingEventTitle} (${reasonLabel})`,
              eventId: refreshedEvent.id,
              priority: 'HIGH',
              type: 'NEW_CONFLICT',
            });
          }
        }
      }
    } catch (notifErr) {
      console.error('Non-blocking notification error on edit:', notifErr);
    }

    return apiSuccess({
      event: refreshedEvent,
      hasConflict: conflictResult.hasConflict,
      flags: conflictResult.flags || [],
      conflicts: conflictResult.conflicts || [],
    });
  } catch (error: any) {
    console.error('PATCH /api/events/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}

// DELETE /api/events/:id - Cancel/delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getServerUser(request);
    if (!user) {
      return apiError(ErrorCodes.UNAUTHORIZED, 'Authentication required to delete events.', 401);
    }

    if (user.role === UserRole.MEMBER) {
      return apiError(ErrorCodes.FORBIDDEN, 'Members are not authorized to delete events.', 403);
    }

    const existing = await dbService.getEventById(id);
    if (!existing) {
      return apiError(ErrorCodes.EVENT_NOT_FOUND, 'Event not found with provided ID.', 404);
    }

    if (user.role === UserRole.CLUB_EXEC) {
      if (user.clubId && existing.clubId !== user.clubId) {
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden: You cannot delete another club’s events.', 403);
      }
      if (existing.status !== EventStatus.PENDING && existing.status !== EventStatus.RESCHEDULE_REQUESTED) {
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden: Club Executives can only delete pending proposals.', 403);
      }
    }

    const deleted = await dbService.deleteEvent(id);
    if (!deleted) {
      return apiError(ErrorCodes.EVENT_NOT_FOUND, 'Event not found with provided ID.', 404);
    }

    return apiSuccess({ id, deleted: true, message: 'Event successfully deleted.' });
  } catch (error: any) {
    console.error('DELETE /api/events/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}
