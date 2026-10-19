import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { requireCore } from '@/lib/auth';
import { apiSuccess, apiError, ErrorCodes } from '@/lib/constants';

// PATCH /api/budgets/:id - Modify budget (ACM Core only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // RBAC: Only CORE_VERIFIER can update budgets
    const auth = await requireCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const existing = await dbService.getBudgetById(id);
    if (!existing) {
      return apiError(ErrorCodes.BUDGET_NOT_FOUND, 'Budget not found.', 404);
    }

    const body = await request.json();
    const { name, amount, periodType, startDate, endDate } = body;

    const updates: any = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Name must be between 1 and 100 characters.', 400);
      }
      updates.name = name.trim();
    }

    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 0) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Amount must be >= 0.', 400);
      }
      updates.amount = numAmount;
    }

    if (periodType !== undefined) updates.periodType = periodType;

    let finalStart = new Date(existing.startDate);
    let finalEnd = new Date(existing.endDate);

    if (startDate) {
      const s = new Date(startDate);
      if (isNaN(s.getTime())) return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid startDate.', 400);
      finalStart = s;
      updates.startDate = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      if (isNaN(e.getTime())) return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid endDate.', 400);
      finalEnd = e;
      updates.endDate = e;
    }

    if (finalEnd <= finalStart) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'endDate must be strictly after startDate.', 400);
    }

    const updated = await dbService.updateBudget(id, updates);
    return apiSuccess(updated);
  } catch (error: any) {
    console.error('PATCH /api/budgets/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}
