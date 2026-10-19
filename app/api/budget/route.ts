import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { requireCore } from '@/lib/auth';
import { apiSuccess, apiError, ErrorCodes } from '@/lib/constants';

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
