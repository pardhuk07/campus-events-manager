import { prisma } from "@/lib/prisma/client";

export async function fetchDashboardData() {
  const now = new Date();

  // ── Run all queries in parallel ──────────────────────────────────
  const [
    upcomingEvents,
    pendingEventsCount,
    activeConflicts,
    activeBudget,
    categorySpending,
    recentExpenses,
  ] = await Promise.all([
    // Next 5 approved events
    prisma.event.findMany({
      where: { startTime: { gte: now } },
      orderBy: { startTime: "asc" },
      take: 10,
      include: { club: { select: { name: true } } },
    }).then((events) => events.filter((e) => (e as any).status === "APPROVED").slice(0, 5)),

    // Count pending approvals
    prisma.event.findMany({
      select: { status: true },
    }).then((events) => events.filter((e) => (e as any).status === "PENDING").length),

    // Flagged conflicts
    prisma.eventConflict.findMany({
      include: {
        event: { select: { id: true, title: true, startTime: true, endTime: true } },
        conflictingEvent: { select: { id: true, title: true, startTime: true, endTime: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }).then((conflicts) => conflicts.filter((c) => (c as any).status === "FLAGGED").slice(0, 5)),

    // Most recent active budget
    prisma.budget.findFirst({
      where: { startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { createdAt: "desc" },
    }),

    // Category-wise spending
    prisma.expense.groupBy({
      by: ["category"],
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),

    // 5 most recent expenses
    prisma.expense.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        event: { select: { title: true } },
        submittedBy: { select: { name: true } },
      },
    }),
  ]);

  // ── Calculate total spent in active budget period ─────────────────
  let totalSpent = 0;
  if (activeBudget) {
    const periodExpenses = await prisma.expense.aggregate({
      where: {
        expenseDate: {
          gte: activeBudget.startDate,
          lte: activeBudget.endDate,
        },
      },
      _sum: { amount: true },
    });
    totalSpent = Number(periodExpenses._sum.amount ?? 0);
  } else {
    const allExpenses = await prisma.expense.aggregate({
      _sum: { amount: true },
    });
    totalSpent = Number(allExpenses._sum.amount ?? 0);
  }

  const budgetAmount = Number(activeBudget?.amount ?? 0);
  const remainingBudget = budgetAmount - totalSpent;

  return {
    stats: {
      upcomingEventsCount: upcomingEvents.length,
      pendingApprovalsCount: pendingEventsCount,
      activeConflictsCount: activeConflicts.length,
      totalSpent,
      remainingBudget,
      activeBudgetName: activeBudget?.name ?? null,
      activeBudgetAmount: budgetAmount,
    },
    upcomingEvents,
    conflictAlerts: activeConflicts,
    recentExpenses,
    categoryBreakdown: categorySpending.map((c) => ({
      category: c.category,
      total: Number(c._sum.amount ?? 0),
    })),
  };
}
