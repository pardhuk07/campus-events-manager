import { prisma, ExpenseCategory } from '@/lib/prisma';

export interface BudgetSummary {
  semester: string;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  percentSpent: number;
  categoryBreakdown: Record<string, number>;
  recentExpenses: any[];
}

export async function getSemesterBudgetSummary(semesterName = 'Fall 2026'): Promise<BudgetSummary> {
  // Execute budget fetch and expenses fetch in parallel via Promise.all
  const [budget, expenses] = await Promise.all([
    prisma.budget.findUnique({
      where: { semester: semesterName },
    }),
    prisma.expense.findMany({
      orderBy: { date: 'desc' },
      include: {
        event: {
          select: { id: true, title: true },
        },
      },
    }),
  ]);

  const totalAllocated = budget ? budget.totalAllocated : 50000.0;

  // Aggregate totals in a single pass
  let totalSpent = 0;
  const categoryBreakdown: Record<string, number> = {};
  for (const cat of Object.values(ExpenseCategory)) {
    categoryBreakdown[cat] = 0;
  }

  for (const exp of expenses) {
    totalSpent += exp.amount;
    categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
  }

  const remainingBudget = totalAllocated - totalSpent;
  const percentSpent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  return {
    semester: semesterName,
    totalBudget: totalAllocated,
    totalSpent,
    remainingBudget,
    percentSpent: Math.round(percentSpent * 100) / 100,
    categoryBreakdown,
    recentExpenses: expenses.slice(0, 15),
  };
}
