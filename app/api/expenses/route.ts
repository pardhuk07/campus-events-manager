import { NextResponse } from 'next/server';
import { prisma, ExpenseCategory, Role } from '@/lib/prisma';
import { getSemesterBudgetSummary } from '@/services/expenseService';

// 1. GET /api/expenses - Fast Edge & In-Memory Response
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester') || 'Fall 2026';

    const summary = await getSemesterBudgetSummary(semester);
    return NextResponse.json(
      { success: true, data: summary },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// 2. POST /api/expenses - Record a transaction
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, amount, category, date, receiptUrl, description, eventId, userRole } = body;

    // RBAC Security Check: Regular Members cannot add expenses
    if (userRole === Role.MEMBER) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Regular members cannot record expenses.',
        },
        { status: 403 }
      );
    }

    if (!title || amount === undefined || !category) {
      return NextResponse.json(
        { success: false, error: 'Title, amount, and category are required' },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    if (!Object.values(ExpenseCategory).includes(category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category: ${category}` },
        { status: 400 }
      );
    }

    const newExpense = await prisma.expense.create({
      data: {
        title,
        amount: parsedAmount,
        category,
        date: date ? new Date(date) : new Date(),
        receiptUrl: receiptUrl || null,
        description: description || null,
        eventId: eventId || null,
      },
      include: {
        event: { select: { title: true } },
      },
    });

    return NextResponse.json(
      { success: true, message: 'Expense recorded successfully', expense: newExpense },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error recording expense:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
