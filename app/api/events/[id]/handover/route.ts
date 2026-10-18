import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes, UserRole } from '@/lib/constants';

// PATCH /api/events/:id/handover - Save lessons learned handover notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { lessonsLearned, userRole } = body;

    // RBAC: Editable by Executives and Core only. Read-only for members.
    const effectiveRole = userRole || request.headers.get('x-user-role');
    const isAllowed =
      effectiveRole === UserRole.CLUB_EXEC ||
      effectiveRole === UserRole.CORE_VERIFIER ||
      effectiveRole === 'ACM_CORE';

    if (!isAllowed) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Access denied: Handover notes and lessons learned are editable by Club Executives and ACM Core only.',
        403
      );
    }

    const event = await dbService.getEventById(id);
    if (!event) {
      return apiError(ErrorCodes.EVENT_NOT_FOUND, 'Event not found with provided ID.', 404);
    }

    const updatedEvent = await dbService.updateEventLessonsLearned(id, lessonsLearned || '');
    return apiSuccess({
      event: updatedEvent,
      message: 'Lessons learned saved successfully.',
    });
  } catch (error: any) {
    console.error('PATCH /api/events/:id/handover error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to save handover notes', 500);
  }
}
