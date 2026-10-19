import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes, UserRole } from '@/lib/constants';
import { requireExecOrCore } from '@/lib/auth';

// PATCH /api/events/:id/handover - Save lessons learned handover notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. STRICT RBAC: Editable by Executives and Core only. Read-only for members.
    const auth = await requireExecOrCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const user = auth.user;

    const event = await dbService.getEventById(id);
    if (!event) {
      return apiError(ErrorCodes.EVENT_NOT_FOUND, 'Event not found with provided ID.', 404);
    }

    // Executives can only edit handover notes for their own club's events
    if (user.role === UserRole.CLUB_EXEC && user.clubId && event.clubId !== user.clubId) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Access denied: You can only edit lessons learned for events hosted by your club.',
        403
      );
    }

    const body = await request.json();
    const { lessonsLearned } = body;

    if (lessonsLearned && typeof lessonsLearned !== 'string') {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'lessonsLearned must be a string.', 400);
    }
    if (lessonsLearned && lessonsLearned.length > 5000) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Lessons learned notes cannot exceed 5000 characters.', 400);
    }

    const updatedEvent = await dbService.updateEventLessonsLearned(id, lessonsLearned ? lessonsLearned.trim() : '');
    return apiSuccess({
      event: updatedEvent,
      message: 'Lessons learned saved successfully.',
    });
  } catch (error: any) {
    console.error('PATCH /api/events/:id/handover error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to save handover notes', 500);
  }
}
