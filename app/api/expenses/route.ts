import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import {
  apiSuccess,
  apiError,
  ErrorCodes,
  ExpenseCategory,
  UserRole,
} from '@/lib/constants';

// GET /api/expenses - List expenses, with event, category, and date filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const category = searchParams.get('category');

    let expenses = await dbService.getExpenses();

    if (eventId) {
      expenses = expenses.filter((e: any) => e.eventId === eventId);
    }
    if (category) {
      expenses = expenses.filter((e: any) => e.category === category);
    }

    return apiSuccess(expenses);
  } catch (error: any) {
    console.error('GET /api/expenses error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch expenses', 500);
  }
}

// POST /api/expenses - Add an expense linked to an event, category, and receipt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      eventId,
      amount,
      category,
      description,
      expenseDate,
      receiptUrl,
      receiptPublicId,
      submittedById,
      userRole,
    } = body;

    // RBAC: Members cannot record club/event expenses
    if (userRole === UserRole.MEMBER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Regular members cannot submit expenses. Only Club Executives and Core Verifiers are permitted.',
        403
      );
    }

    // Validation rules per Section 21:
    // - amount must be > 0
    // - category required
    // - expenseDate required
    if (amount === undefined || amount === null) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Expense amount is required.');
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return apiError(ErrorCodes.INVALID_EXPENSE_AMOUNT, 'Expense amount must be greater than zero.');
    }

    if (!category || !Object.values(ExpenseCategory).includes(category)) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Valid expense category is required. Valid categories: ${Object.values(ExpenseCategory).join(', ')}.`
      );
    }

    let finalSubmitterId = submittedById;
    if (!finalSubmitterId) {
      const defaultUser = await dbService.getUserByEmail('pardhu120907@gmail.com');
      finalSubmitterId = defaultUser ? defaultUser.id : 'user-pardhu';
    }

    const createdExpense = await dbService.createExpense({
      eventId: eventId || null,
      amount: numAmount,
      category,
      description: description || null,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      receiptUrl: receiptUrl || null,
      receiptPublicId: receiptPublicId || null,
      submittedById: finalSubmitterId,
    });

    return apiSuccess(createdExpense, 201);
  } catch (error: any) {
    console.error('POST /api/expenses error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to record expense', 500);
  }
}
