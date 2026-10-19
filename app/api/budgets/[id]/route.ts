import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";
import { UpdateBudgetSchema } from "@/lib/validations/expense-budget";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      where: { id },
    });

    if (!existing) {
      return errorResponse("BUDGET_NOT_FOUND", "Budget not found", 404);
    }

    const data: any = { ...parseResult.data };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const updated = await prisma.budget.update({
      where: { id },
      data,
    });

    // Recompute totalSpent
    const expenses = await prisma.expense.aggregate({
      where: {
        expenseDate: {
          gte: updated.startDate,
          lte: updated.endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const totalSpent = Number(expenses._sum.amount ?? 0);
    const remainingBudget = Number(updated.amount) - totalSpent;

    return successResponse({
      ...updated,
      totalSpent,
      remainingBudget,
    });
  } catch (error: any) {
    console.error("PATCH /api/budgets/:id error:", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to update budget", 500);
  }
}
