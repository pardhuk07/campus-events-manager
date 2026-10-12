import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes, ExpenseCategory } from '@/lib/constants';

// GET /api/analytics - Deep statistics on events, monthly spending, category breakdown
export async function GET() {
  try {
    const [events, expenses, budgets] = await Promise.all([
      dbService.getEvents(),
      dbService.getExpenses(),
      dbService.getBudgets(),
    ]);

    // Monthly spending breakdown
    const monthlySpending: Record<string, number> = {};
    for (const ex of expenses) {
      const month = new Date(ex.expenseDate).toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlySpending[month] = (monthlySpending[month] || 0) + parseFloat(ex.amount);
    }

    // Category spending
    const categoryBreakdown: Record<string, number> = {};
    for (const cat of Object.values(ExpenseCategory)) {
      categoryBreakdown[cat] = 0;
    }
    for (const ex of expenses) {
      categoryBreakdown[ex.category] = (categoryBreakdown[ex.category] || 0) + parseFloat(ex.amount);
    }

    // Event venue usage
    const venueUsage: Record<string, number> = {};
    for (const ev of events) {
      venueUsage[ev.venue] = (venueUsage[ev.venue] || 0) + 1;
    }

    // Club event counts
    const clubActivity: Record<string, number> = {};
    for (const ev of events) {
      const name = ev.club?.name || 'Unknown';
      clubActivity[name] = (clubActivity[name] || 0) + 1;
    }

    return apiSuccess({
      totalEvents: events.length,
      totalExpensesCount: expenses.length,
      monthlySpending,
      categoryBreakdown,
      venueUsage,
      clubActivity,
      activeBudget: budgets[0] || null,
    });
  } catch (error: any) {
    console.error('GET /api/analytics error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to load analytics', 500);
  }
}
