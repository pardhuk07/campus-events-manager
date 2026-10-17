import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes, UserRole } from '@/lib/constants';
import { query } from '@/lib/db';

// GET /api/events/pending - Restricted to ACM Core role
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole') || request.headers.get('x-user-role');

    // STRICT RBAC ENFORCEMENT IN API ROUTE
    if (userRole !== UserRole.CORE_VERIFIER && userRole !== 'ACM_CORE') {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Access denied: The Pending Review queue is strictly restricted to ACM Core members.',
        403
      );
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
