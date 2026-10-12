import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes, UserRole } from '@/lib/constants';

// PATCH /api/budgets/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, amount, periodType, startDate, endDate, userRole } = body;

    // RBAC: Only CORE_VERIFIER can update budgets
    if (userRole !== UserRole.CORE_VERIFIER) {
      return apiError(ErrorCodes.FORBIDDEN, 'Only Core Verifiers can modify budgets.', 403);
    }

    const existing = await dbService.getBudgetById(id);
    if (!existing) {
      return apiError(ErrorCodes.BUDGET_NOT_FOUND, 'Budget not found.', 404);
    }

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 0) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Amount must be >= 0.');
      }
      updates.amount = numAmount;
    }
    if (periodType) updates.periodType = periodType;
    if (startDate) updates.startDate = new Date(startDate);
    if (endDate) updates.endDate = new Date(endDate);

    const updated = await dbService.updateBudget(id, updates);
    return apiSuccess(updated);
  } catch (error: any) {
    console.error('PATCH /api/budgets/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}
