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
  // 1. Fetch allocated budget
  const budget = await prisma.budget.findUnique({
    where: { semester: semesterName },
  });

  const totalAllocated = budget ? budget.totalAllocated : 50000.0;

  // 2. Fetch all expenses with linked event
  const expenses = await prisma.expense.findMany({
    orderBy: { date: 'desc' },
    include: {
      event: {
        select: { id: true, title: true },
      },
    },
  });

  // 3. Aggregate totals
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingBudget = totalAllocated - totalSpent;
  const percentSpent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  // 4. Category-wise breakdown
  const categoryBreakdown: Record<string, number> = {};
  for (const cat of Object.values(ExpenseCategory)) {
    categoryBreakdown[cat] = 0;
  }

  for (const exp of expenses) {
    categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
  }

  return {
    semester: semesterName,
    totalBudget: totalAllocated,
    totalSpent,
    remainingBudget,
    percentSpent: Math.round(percentSpent * 100) / 100,
    categoryBreakdown,
    recentExpenses: expenses.slice(0, 10),
  };
}
