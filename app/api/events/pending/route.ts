import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes } from '@/lib/constants';
import { query } from '@/lib/db';
import { requireCore } from '@/lib/auth';

// GET /api/events/pending - Restricted to ACM Core role
export async function GET(request: NextRequest) {
  try {
    // STRICT RBAC ENFORCEMENT: ACM Core only
    const auth = await requireCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    // List all events with status 'PENDING', newest first
    const pendingEvents = await dbService.getPendingEvents();

    // Query active semester budget & calculate remaining balance
    const budgetRows = await query('SELECT * FROM "Budget" ORDER BY "createdAt" DESC LIMIT 1');
    const activeBudget = budgetRows[0] || { amount: 50000 };
    const totalBudget = parseFloat(activeBudget.amount) || 50000;

    // Calculate total spent so far from approved expenses
    const expenseRows = await query('SELECT COALESCE(SUM(amount), 0) as spent FROM "Expense"');
    const spentAmount = parseFloat(expenseRows[0]?.spent || 0);
    const remainingBudget = Math.max(0, totalBudget - spentAmount);

    return apiSuccess({
      events: pendingEvents,
      totalPending: pendingEvents.length,
      budget: {
        total: totalBudget,
        spent: spentAmount,
        remaining: remainingBudget,
      },
    });
  } catch (error: any) {
    console.error('GET /api/events/pending error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch pending reviews', 500);
  }
}
