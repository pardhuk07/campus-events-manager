import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes, EventStatus, ConflictStatus, ExpenseCategory } from '@/lib/constants';

// GET /api/dashboard - Centralized dashboard reading real data from events, conflicts, expenses, and budgets
export async function GET() {
  try {
    const [events, conflicts, expenses, budgets] = await Promise.all([
      dbService.getEvents(),
      dbService.getConflicts(),
      dbService.getExpenses(),
      dbService.getBudgets(),
    ]);

    const now = new Date();

    // 1. Upcoming Events
    const upcomingEvents = events
      .filter((e: any) => new Date(e.startTime) >= now && e.status === EventStatus.APPROVED)
      .slice(0, 5);

    // 2. Pending Events awaiting approval
    const pendingEvents = events.filter((e: any) => e.status === EventStatus.PENDING);

    // 3. Potential Conflicts flagged
    const flaggedConflicts = conflicts.filter((c: any) => c.status === ConflictStatus.FLAGGED);

    // 4. Financial Calculations
    const activeBudget = budgets[0] || {
      name: 'Fall 2026 Semester Budget',
      amount: 50000,
    };
    const totalAllocated = parseFloat(activeBudget.amount);
    const totalSpent = expenses.reduce((sum: number, ex: any) => sum + parseFloat(ex.amount), 0);
    const remainingBudget = totalAllocated - totalSpent;
    const percentSpent = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 1000) / 10 : 0;

    // 5. Category-wise Spending
    const categorySpending: Record<string, number> = {};
    for (const cat of Object.values(ExpenseCategory)) {
      categorySpending[cat] = 0;
    }
    for (const ex of expenses) {
      if (categorySpending[ex.category] !== undefined) {
        categorySpending[ex.category] += parseFloat(ex.amount);
      }
    }

    return apiSuccess({
      mainCards: {
        upcomingEventsCount: upcomingEvents.length,
        pendingEventsCount: pendingEvents.length,
        potentialConflictsCount: flaggedConflicts.length,
        totalSpending: totalSpent,
        remainingBudget,
        percentSpent,
      },
      upcomingEvents,
      pendingEvents: pendingEvents.slice(0, 5),
      conflictAlerts: flaggedConflicts.slice(0, 5),
      budgetSummary: {
        budgetName: activeBudget.name,
        totalAllocated,
        totalSpent,
        remainingBudget,
        percentSpent,
      },
      categorySpending,
      recentActivity: {
        latestEvents: events.slice(0, 5),
        latestExpenses: expenses.slice(0, 5),
      },
    });
  } catch (error: any) {
    console.error('GET /api/dashboard error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to load dashboard', 500);
  }
}
