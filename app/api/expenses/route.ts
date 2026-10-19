import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { getServerUser, requireExecOrCore } from '@/lib/auth';
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

    const user = await getServerUser(request);
    const userRole = user?.role || UserRole.MEMBER;

    let expenses = await dbService.getExpenses();

    // Members and unauthenticated visitors can view public expense records
    // but receipt URLs or internal IDs are kept intact or filtered as needed
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

// POST /api/expenses - Add an expense linked to an approved event, category, and date
export async function POST(request: NextRequest) {
  try {
    // 1. STRICT SERVER-SIDE RBAC ENFORCEMENT: Club Executives & ACM Core only
    const auth = await requireExecOrCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const user = auth.user;

    const body = await request.json();
    const {
      eventId,
      amount,
      category,
      description,
      expenseDate,
      receiptUrl,
      receiptPublicId,
      receiptFileName,
    } = body;

    // 2. Validate Amount (₹, required, strictly greater than 0)
    if (amount === undefined || amount === null || amount === '') {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Amount (₹) is required.', 400);
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Amount (₹) must be a number greater than 0.', 400);
    }

    // 3. Validate Category (the existing 8 categories)
    if (!category || !Object.values(ExpenseCategory).includes(category as any)) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Category is required and must be one of: ${Object.values(ExpenseCategory).join(', ')}.`,
        400
      );
    }

    // 4. Validate Date (defaults to today)
    let finalDate = new Date();
    if (expenseDate) {
      finalDate = new Date(expenseDate);
      if (isNaN(finalDate.getTime())) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'A valid expense date is required.', 400);
      }
    }

    // 5. Validate Event (required dropdown of approved events, save linked to event)
    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Event is required. Please select an approved event.', 400);
    }
    const linkedEvent = await dbService.getEventById(eventId.trim());
    if (!linkedEvent) {
      return apiError(ErrorCodes.EVENT_NOT_FOUND, 'The selected event was not found in the database.', 404);
    }
    if (linkedEvent.status !== 'APPROVED') {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Expenses can only be recorded for approved events. Selected event has status '${linkedEvent.status}'.`,
        400
      );
    }

    // 6. Validate Description (required, max 200 characters)
    if (!description || typeof description !== 'string' || !description.trim()) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Description is required.', 400);
    }
    if (description.trim().length > 200) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Description cannot exceed 200 characters. Currently ${description.trim().length} characters.`,
        400
      );
    }

    // 7. Validate Receipt requirement (Required for expenses over ₹500, optional below that)
    if (numAmount > 500) {
      if (!receiptUrl || typeof receiptUrl !== 'string' || !receiptUrl.trim()) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          'Receipt upload is required for any expense over ₹500.',
          400
        );
      }
    }

    // 8. Check semester budget impact (₹50,000 threshold)
    const existingExpenses = await dbService.getExpenses();
    const currentTotalSpent = existingExpenses.reduce(
      (sum: number, ex: any) => sum + (parseFloat(ex.amount) || 0),
      0
    );
    const projectedTotalSpent = currentTotalSpent + numAmount;
    let budgetWarning: string | null = null;
    if (projectedTotalSpent > 50000) {
      const excess = projectedTotalSpent - 50000;
      budgetWarning = `This exceeds the semester budget by ₹${excess.toLocaleString('en-IN')}`;
    }

    // 9. Persist Expense in database linked to event and receipt, using server-verified user identity
    const createdExpense = await dbService.createExpense({
      eventId: linkedEvent.id,
      amount: numAmount,
      category,
      description: description.trim(),
      expenseDate: finalDate,
      receiptUrl: receiptUrl ? String(receiptUrl).trim() : null,
      receiptPublicId: receiptPublicId ? String(receiptPublicId).trim() : null,
      receiptFileName: receiptFileName ? String(receiptFileName).trim() : null,
      submittedById: user.id,
      addedByName: user.name || (user.role === UserRole.CORE_VERIFIER ? 'ACM Core' : 'Club Executive'),
    });

    return apiSuccess(
      {
        expense: createdExpense,
        warning: budgetWarning,
        totalSpent: projectedTotalSpent,
      },
      201
    );
  } catch (error: any) {
    console.error('POST /api/expenses error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to record expense', 500);
  }
}
