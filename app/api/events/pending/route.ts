import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes } from '@/lib/constants';
import { query } from '@/lib/db';
import { requireCore } from '@/lib/auth';
import { budgetService } from '@/lib/budgetService';

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

    // Attach club semester budget calculations for each pending event
    const activeSem = await budgetService.getActiveSemester();

    const eventsWithBudget = await Promise.all(
      pendingEvents.map(async (ev: any) => {
        let semesterId = ev.semesterId;
        if (!semesterId) {
          const sRows = await query<any>(
            `SELECT id FROM "Semester" WHERE $1 >= "startDate" AND $1 <= "endDate" ORDER BY "startDate" DESC LIMIT 1`,
            [ev.startTime]
          );
          semesterId = sRows[0]?.id || activeSem?.id;
        }

        let clubBudget: any = null;
        if (ev.clubId && semesterId) {
          try {
            const details = await budgetService.getClubBudgetDetails(ev.clubId, semesterId);
            clubBudget = {
              semesterId: details.semester.id,
              semesterName: details.semester.name,
              allocated: details.allocated,
              committed: details.committed,
              spent: details.spent,
              remaining: details.remaining,
              availableToPlan: details.availableToPlan,
            };
          } catch (e) {
            console.error('Failed to get club budget details for pending event:', e);
          }
        }

        return {
          ...ev,
          clubBudget,
        };
      })
    );

    // Query active semester budget & calculate remaining balance
    const budgetRows = await query('SELECT * FROM "Budget" ORDER BY "createdAt" DESC LIMIT 1');
    const activeBudget = budgetRows[0] || { amount: 50000 };
    const totalBudget = parseFloat(activeBudget.amount) || 50000;

    // Calculate total spent so far from approved expenses
    const expenseRows = await query('SELECT COALESCE(SUM(amount), 0) as spent FROM "Expense"');
    const spentAmount = parseFloat(expenseRows[0]?.spent || 0);
    const remainingBudget = Math.max(0, totalBudget - spentAmount);

    return apiSuccess({
      events: eventsWithBudget,
      totalPending: eventsWithBudget.length,
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
