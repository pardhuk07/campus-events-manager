import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
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
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');
    const event = await dbService.getEventById(id);

    if (!event) {
      return apiError(ErrorCodes.EVENT_NOT_FOUND, 'Event not found with provided ID.', 404);
    }

    // Public users cannot view pending or rejected events
    if ((userRole === UserRole.MEMBER || userRole === 'PUBLIC') && event.status !== EventStatus.APPROVED) {
      return apiError(ErrorCodes.EVENT_NOT_FOUND, 'Event is not approved for public viewing.', 404);
    }

    return apiSuccess(event);
  } catch (error: any) {
    console.error('GET /api/events/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}

// PATCH /api/events/:id - Update event details or update status (Approve/Reject by CORE_VERIFIER)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userRole, status, title, description, venue, startTime, endTime, audienceTags, expectedAttendance, category } = body;

    const existingEvent = await dbService.getEventById(id);
    if (!existingEvent) {
      return apiError(ErrorCodes.EVENT_NOT_FOUND, 'Event not found with provided ID.', 404);
    }

    // RBAC: Status review (APPROVED, REJECTED, CANCELLED) can ONLY be executed by CORE_VERIFIER
    if (status) {
      if (userRole !== UserRole.CORE_VERIFIER) {
        return apiError(
          ErrorCodes.FORBIDDEN,
          'Only ACM Core / CORE_VERIFIER can approve, reject, or update event statuses.',
          403
        );
      }
      if (!Object.values(EventStatus).includes(status)) {
        return apiError(ErrorCodes.VALIDATION_ERROR, `Invalid event status: ${status}.`);
      }
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (venue) updates.venue = venue.trim();
    if (startTime) updates.startTime = new Date(startTime);
    if (endTime) updates.endTime = new Date(endTime);
    if (audienceTags) updates.audienceTags = audienceTags;
    if (expectedAttendance !== undefined) updates.expectedAttendance = Number(expectedAttendance);
    if (category !== undefined) updates.category = category;

    const updatedEvent = await dbService.updateEvent(id, updates);
    return apiSuccess(updatedEvent);
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
    const body = await request.json().catch(() => ({}));
    const { userRole } = body;

    // RBAC check: Members cannot delete events
    if (userRole === UserRole.MEMBER) {
      return apiError(ErrorCodes.FORBIDDEN, 'Members are not authorized to delete events.', 403);
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
