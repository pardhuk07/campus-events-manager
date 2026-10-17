import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes, UserRole } from '@/lib/constants';

// POST /api/events/:id/review - Core review decision endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { decision, comment, reviewerName, userRole } = body;

    // 1. STRICT RBAC ENFORCEMENT IN API ROUTE
    const effectiveRole = userRole || request.headers.get('x-user-role');
    if (effectiveRole !== UserRole.CORE_VERIFIER && effectiveRole !== 'ACM_CORE') {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Access denied: Only ACM Core members (CORE_VERIFIER) can review proposals and render decisions.',
        403
      );
    }

    // 2. Validate Event Exists
    const existing = await dbService.getEventById(id);
    if (!existing) {
      return apiError(ErrorCodes.EVENT_NOT_FOUND, 'Event proposal not found with provided ID.', 404);
    }

    // 3. Validate Decision Type
    const validDecisions = ['APPROVE', 'REJECT', 'RESCHEDULE_REQUESTED'];
    if (!decision || !validDecisions.includes(decision.toUpperCase())) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Invalid decision '${decision}'. Allowed: APPROVE, REJECT, RESCHEDULE_REQUESTED.`
      );
    }

    const normDecision = decision.toUpperCase() as 'APPROVE' | 'REJECT' | 'RESCHEDULE_REQUESTED';

    // 4. Strict Comment Validation for Reject and Reschedule
    if (normDecision === 'REJECT' || normDecision === 'RESCHEDULE_REQUESTED') {
      if (!comment || !comment.trim()) {
        const actionLabel = normDecision === 'REJECT' ? 'rejecting' : 'requesting a reschedule';
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `A review comment is strictly required when ${actionLabel} an event proposal.`
        );
      }
    }

    // 5. Persist Decision, Comment, Reviewer, and Timestamp on the Event
    const updatedEvent = await dbService.reviewEvent({
      eventId: id,
      decision: normDecision,
      comment: comment ? comment.trim() : null,
      reviewerName: reviewerName || 'ACM Core Verifier',
    });

    return apiSuccess({
      event: updatedEvent,
      message:
        normDecision === 'APPROVE'
          ? 'Event proposal approved successfully. It will now appear on the public calendar.'
          : normDecision === 'REJECT'
          ? 'Event proposal rejected with feedback note.'
          : 'Reschedule request recorded. Organizer notified with adjustment notes.',
    });
  } catch (error: any) {
    console.error('POST /api/events/:id/review error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error processing review', 500);
  }
}
