import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";
import { CreateExpenseSchema } from "@/lib/validations/expense-budget";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (eventId) where.eventId = eventId;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        event: {
          select: { id: true, title: true, clubId: true },
        },
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { expenseDate: "desc" },
    });

    return successResponse(expenses);
  } catch (error: any) {
    console.error("GET /api/expenses error:", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to fetch expenses", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = CreateExpenseSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parseResult.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const data = parseResult.data;

    // If eventId is provided, verify event exists
    if (data.eventId) {
      const event = await prisma.event.findUnique({
        where: { id: data.eventId },
      });
      if (!event) {
        return errorResponse("EVENT_NOT_FOUND", "Referenced event does not exist", 404);
      }
    }

    const expense = await prisma.expense.create({
      data: {
        amount: data.amount,
        category: data.category,
        description: data.description,
        expenseDate: new Date(data.expenseDate),
        receiptUrl: data.receiptUrl,
        receiptPublicId: data.receiptPublicId,
        submittedById: data.submittedById,
        eventId: data.eventId || null,
      },
      include: {
        event: {
          select: { id: true, title: true },
        },
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return successResponse(expense, 201);
  } catch (error: any) {
    console.error("POST /api/expenses error:", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to create expense", 500);
  }
}
