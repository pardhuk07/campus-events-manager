import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { requireCore } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  ErrorCodes,
  BudgetPeriod,
} from '@/lib/constants';

// GET /api/budgets - List budgets with dynamically computed remainingBudget (public summary)
export async function GET() {
  try {
    const budgets = await dbService.getBudgets();
    const expenses = await dbService.getExpenses();

    const budgetsWithCalculations = budgets.map((b: any) => {
      const budgetStart = new Date(b.startDate).getTime();
      const budgetEnd = new Date(b.endDate).getTime();
      const allocated = parseFloat(b.amount);

      const periodExpenses = expenses.filter((ex: any) => {
        const exTime = new Date(ex.expenseDate).getTime();
        return exTime >= budgetStart && exTime <= budgetEnd;
      });

      const totalSpent = periodExpenses.reduce((sum: number, ex: any) => sum + parseFloat(ex.amount), 0);
      const remainingBudget = allocated - totalSpent;

      return {
        ...b,
        amount: allocated,
        totalSpent,
        remainingBudget,
        percentSpent: allocated > 0 ? Math.round((totalSpent / allocated) * 1000) / 10 : 0,
      };
    });

    return apiSuccess(budgetsWithCalculations);
  } catch (error: any) {
    console.error('GET /api/budgets error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch budgets', 500);
  }
}

// POST /api/budgets - Create a budget period (ACM Core only)
export async function POST(request: NextRequest) {
  try {
    // RBAC: Only CORE_VERIFIER can create budgets
    const auth = await requireCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const body = await request.json();
    const { name, amount, periodType, startDate, endDate } = body;

    if (!name || typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Budget name is required (max 100 characters).', 400);
    }
    if (amount === undefined || amount === null) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Amount is required.', 400);
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Amount must be greater than or equal to 0.', 400);
    }

    if (!startDate || !endDate) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'startDate and endDate are required.', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'startDate must be valid and before endDate.', 400);
    }

    const budget = await dbService.createBudget({
      name: name.trim(),
      amount: numAmount,
      periodType: periodType || BudgetPeriod.SEMESTER,
      startDate: start,
      endDate: end,
    });

    return apiSuccess(budget, 201);
  } catch (error: any) {
    console.error('POST /api/budgets error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to create budget', 500);
  }
}
