import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";
import { UpdateExpenseSchema } from "@/lib/validations/expense-budget";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: {
        event: {
          select: { id: true, title: true, clubId: true },
        },
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!expense) {
      return errorResponse("EXPENSE_NOT_FOUND", "Expense record not found", 404);
    }

    return successResponse(expense);
  } catch (error: any) {
    console.error("GET /api/expenses/:id error:", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to retrieve expense", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parseResult = UpdateExpenseSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const existing = await prisma.expense.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return errorResponse("EXPENSE_NOT_FOUND", "Expense record not found", 404);
    }

    const data: any = { ...parseResult.data };
    if (data.expenseDate) {
      data.expenseDate = new Date(data.expenseDate);
    }

    const updated = await prisma.expense.update({
      where: { id: params.id },
      data,
      include: {
        event: {
          select: { id: true, title: true },
        },
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return successResponse(updated);
  } catch (error: any) {
    console.error("PATCH /api/expenses/:id error:", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to update expense", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.expense.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return errorResponse("EXPENSE_NOT_FOUND", "Expense record not found", 404);
    }

    await prisma.expense.delete({
      where: { id: params.id },
    });

    return successResponse({ id: params.id, message: "Expense deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/expenses/:id error:", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to delete expense", 500);
  }
}
