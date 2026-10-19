import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { requireCore, requireExecOrCore } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  ErrorCodes,
  ConflictStatus,
} from '@/lib/constants';

// GET /api/conflicts/:id - View single conflict record (Execs and Core)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireExecOrCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

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

// PATCH /api/conflicts/:id - Resolve, dismiss, or review conflict (ACM Core only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // RBAC: Only CORE_VERIFIER can review, dismiss, or resolve conflicts
    const auth = await requireCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const user = auth.user;

    const { id } = await params;
    const existing = await dbService.getConflictById(id);
    if (!existing) {
      return apiError(ErrorCodes.CONFLICT_NOT_FOUND, 'Conflict record not found.', 404);
    }

    const body = await request.json();
    const { status, resolutionNote } = body;

    if (status && !Object.values(ConflictStatus).includes(status)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, `Invalid conflict status: ${status}.`, 400);
    }

    if (resolutionNote && typeof resolutionNote === 'string' && resolutionNote.length > 1000) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Resolution note cannot exceed 1000 characters.', 400);
    }

    const updated = await dbService.updateConflict(id, {
      status,
      reviewedById: user.id,
      resolutionNote: resolutionNote ? String(resolutionNote).trim() : null,
    });

    return apiSuccess(updated);
  } catch (error: any) {
    console.error('PATCH /api/conflicts/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}
