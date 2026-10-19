import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { requireCore } from '@/lib/auth';
import { apiSuccess, apiError, ErrorCodes } from '@/lib/constants';

import { getServerUser } from '@/lib/auth';
import { UserRole } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser(request);
    if (!user || user.role === UserRole.MEMBER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Forbidden: Budget records are confidential and restricted from public and member access.',
        403
      );
    }

    const { budgetService } = await import('@/lib/budgetService');
    const activeSem = await budgetService.getActiveSemester();
    if (!activeSem) {
      return apiError(ErrorCodes.BUDGET_NOT_FOUND, 'No active semester found.', 404);
    }

    if (user.role === UserRole.CLUB_EXEC) {
      if (!user.clubId) {
        return apiError(ErrorCodes.FORBIDDEN, 'Executive account not linked to club.', 403);
      }
      const details = await budgetService.getClubBudgetDetails(user.clubId, activeSem.id);
      return apiSuccess(details);
    }

    const summary = await budgetService.getAllClubsSummary(activeSem.id);
    return apiSuccess(summary);
  } catch (error: any) {
    console.error('GET /api/budget error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // RBAC Security Check: Only ACM Core Verifiers can adjust the semester budget
    const auth = await requireCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const body = await request.json();
    const { amount, totalAllocated } = body;

    const parsedBudget = parseFloat(amount || totalAllocated);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'Budget amount must be a positive number.',
        400
      );
    }

    const budgets = await dbService.getBudgets();
    const active = budgets[0];
    if (active) {
      const updated = await dbService.updateBudget(active.id, { amount: parsedBudget });
      return apiSuccess({
        message: `Semester budget successfully updated to ₹${parsedBudget.toLocaleString()}`,
        budget: updated,
      });
    }

    return apiError(ErrorCodes.BUDGET_NOT_FOUND, 'No active budget found', 404);
  } catch (error: any) {
    console.error('Error updating budget:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}
