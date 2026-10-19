import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";
import { CreateBudgetSchema } from "@/lib/validations/expense-budget";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const budgets = await prisma.budget.findMany({
      orderBy: { startDate: "desc" },
    });

    // Calculate remainingBudget dynamically: budget.amount - totalExpensesForPeriod
    const budgetsWithRemaining = await Promise.all(
      budgets.map(async (budget) => {
        const expenseAggregate = await prisma.expense.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            expenseDate: {
              gte: budget.startDate,
              lte: budget.endDate,
            },
          },
        });

        const totalSpent = Number(expenseAggregate._sum.amount ?? 0);
        const budgetAmount = Number(budget.amount);
        const remainingBudget = budgetAmount - totalSpent;

        return {
          ...budget,
          amount: budgetAmount,
          totalSpent,
          remainingBudget,
        };
      })
    );

    return successResponse(budgetsWithRemaining);
  } catch (error: any) {
    console.error("GET /api/budgets error:", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to fetch budgets", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = CreateBudgetSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const data = parseResult.data;

    const budget = await prisma.budget.create({
      data: {
        name: data.name,
        amount: data.amount,
        periodType: data.periodType,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });

    return successResponse(
      {
        ...budget,
        amount: Number(budget.amount),
        totalSpent: 0,
        remainingBudget: Number(budget.amount),
      },
      201
    );
  } catch (error: any) {
    console.error("POST /api/budgets error:", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to create budget", 500);
  }
}
