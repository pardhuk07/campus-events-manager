import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";
import { UpdateBudgetSchema } from "@/lib/validations/expense-budget";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parseResult = UpdateBudgetSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const existing = await prisma.budget.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return errorResponse("BUDGET_NOT_FOUND", "Budget record not found", 404);
    }

    const data: any = { ...parseResult.data };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const updated = await prisma.budget.update({
      where: { id: params.id },
      data,
    });

    // Recompute totalSpent and remainingBudget
    const expenseAggregate = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        expenseDate: {
          gte: updated.startDate,
          lte: updated.endDate,
        },
      },
    });

    const totalSpent = Number(expenseAggregate._sum.amount ?? 0);
    const budgetAmount = Number(updated.amount);

    return successResponse({
      ...updated,
      amount: budgetAmount,
      totalSpent,
      remainingBudget: budgetAmount - totalSpent,
    });
  } catch (error: any) {
    console.error("PATCH /api/budgets/:id error:", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to update budget", 500);
  }
}
