import { NextRequest } from 'next/server';
import { budgetService } from '@/lib/budgetService';
import { getServerUser, requireCore } from '@/lib/auth';
import { apiSuccess, apiError, ErrorCodes, UserRole } from '@/lib/constants';

// GET /api/club-budgets
// Returns club budget calculations for a club and semester:
// allocated, committed, spent, remaining, availableToPlan, perEventRows, monthlySpending, changeLogs
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser(request);

    // Strict Permissions:
    // - Public & Member: 403 Forbidden on every budget route
    // - Club Executive: sees only their own club
    // - ACM Core: sees all clubs
    if (!user || user.role === UserRole.MEMBER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Forbidden: Budget allocations and calculations are confidential and restricted from public and member access.',
        403
      );
    }

    const { searchParams } = new URL(request.url);
    let requestedClubId = searchParams.get('clubId');
    let semesterId = searchParams.get('semesterId');

    // Resolve semester if not explicitly provided
    if (!semesterId) {
      const activeSem = await budgetService.getActiveSemester();
      if (!activeSem) {
        return apiError(ErrorCodes.BUDGET_NOT_FOUND, 'No active semester found.', 404);
      }
      semesterId = activeSem.id;
    }

    // Role-based club access restriction
    if (user.role === UserRole.CLUB_EXEC) {
      if (!user.clubId) {
        return apiError(
          ErrorCodes.FORBIDDEN,
          'Forbidden: Your executive account is not linked to an official campus club.',
          403
        );
      }
      if (requestedClubId && requestedClubId !== user.clubId) {
        return apiError(
          ErrorCodes.FORBIDDEN,
          'Forbidden: Club Executives can only inspect their own club budget.',
          403
        );
      }
      requestedClubId = user.clubId;
    }

    // If a specific club is requested or user is an Executive
    if (requestedClubId) {
      const details = await budgetService.getClubBudgetDetails(requestedClubId, semesterId);
      return apiSuccess(details);
    }

    // ACM Core requesting overview of all clubs for this semester
    const overview = await budgetService.getAllClubsSummary(semesterId);
    return apiSuccess(overview);
  } catch (error: any) {
    console.error('GET /api/club-budgets error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch club budget', 500);
  }
}

// POST /api/club-budgets
// Creates or updates a fixed ClubBudget allocation for a semester.
// STRICT RBAC: Only ACM Core can call. Every change REQUIRES a reason and writes a BudgetChangeLog row.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const coreUser = auth.user;

    const body = await request.json();
    const { clubId, semesterId, allocatedAmount, reason } = body;

    if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'clubId is required.', 400);
    }

    if (!semesterId || typeof semesterId !== 'string' || !semesterId.trim()) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'semesterId is required.', 400);
    }

    if (allocatedAmount === undefined || allocatedAmount === null || allocatedAmount === '') {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'allocatedAmount is required.', 400);
    }

    const numAllocated = parseFloat(allocatedAmount);
    if (isNaN(numAllocated) || numAllocated < 0) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'allocatedAmount must be a non-negative number.', 400);
    }

    // Mandatory Reason Check: "every change requires a reason and writes a BudgetChangeLog row"
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'A justification reason is strictly required when setting or updating a club semester budget.',
        400
      );
    }

    const result = await budgetService.upsertClubBudget({
      clubId: clubId.trim(),
      semesterId: semesterId.trim(),
      allocatedAmount: Math.round(numAllocated),
      reason: reason.trim(),
      changedBy: coreUser.name || 'ACM Core Verifier',
      changedById: coreUser.id,
    });

    return apiSuccess(result, 201);
  } catch (error: any) {
    console.error('POST /api/club-budgets error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to update club budget', 500);
  }
}
