import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import {
  apiSuccess,
  apiError,
  ErrorCodes,
  ConflictStatus,
  UserRole,
} from '@/lib/constants';

// GET /api/conflicts/:id - View single conflict record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conflict = await dbService.getConflictById(id);

    if (!conflict) {
      return apiError(ErrorCodes.CONFLICT_NOT_FOUND, 'Conflict record not found.', 404);
    }

    return apiSuccess(conflict);
  } catch (error: any) {
    console.error('GET /api/conflicts/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}

// PATCH /api/conflicts/:id - Resolve, dismiss, or review conflict (Store human resolution note)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reviewedById, resolutionNote, userRole } = body;

    // RBAC: Only CORE_VERIFIER can review, dismiss, or resolve conflicts
    if (userRole !== UserRole.CORE_VERIFIER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Only ACM Core / CORE_VERIFIER can review and resolve conflicts.',
        403
      );
    }

    const existing = await dbService.getConflictById(id);
    if (!existing) {
      return apiError(ErrorCodes.CONFLICT_NOT_FOUND, 'Conflict record not found.', 404);
    }

    if (status && !Object.values(ConflictStatus).includes(status)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, `Invalid conflict status: ${status}.`);
    }

    const updated = await dbService.updateConflict(id, {
      status,
      reviewedById: reviewedById || 'user-pardhu',
      resolutionNote: resolutionNote || null,
    });

    return apiSuccess(updated);
  } catch (error: any) {
    console.error('PATCH /api/conflicts/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}
