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

// POST /api/expenses - Add an expense linked to an approved event, category, and date
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
      receiptFileName,
      submittedById,
      addedByName,
      userRole,
    } = body;

    // 1. STRICT RBAC ENFORCEMENT: Visible and permitted to Club Executive and ACM Core roles only
    const effectiveRole = userRole || request.headers.get('x-user-role');
    const isAllowed =
      effectiveRole === UserRole.CLUB_EXEC ||
      effectiveRole === UserRole.CORE_VERIFIER ||
      effectiveRole === 'ACM_CORE';

    if (!isAllowed) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Access denied: Only Club Executives and ACM Core members are permitted to record expenses.',
        403
      );
    }

    // 2. Validate Amount (₹, required, strictly greater than 0)
    if (amount === undefined || amount === null || amount === '') {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Amount (₹) is required.');
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Amount (₹) must be a number greater than 0.');
    }

    // 3. Validate Category (the existing 8 categories)
    if (!category || !Object.values(ExpenseCategory).includes(category as any)) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Category is required and must be one of: ${Object.values(ExpenseCategory).join(', ')}.`
      );
    }

    // 4. Validate Date (defaults to today)
    let finalDate = new Date();
    if (expenseDate) {
      finalDate = new Date(expenseDate);
      if (isNaN(finalDate.getTime())) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'A valid expense date is required.');
      }
    }

    // 5. Validate Event (required dropdown of approved events, save linked to event)
    if (!eventId || !eventId.trim()) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Event is required. Please select an approved event.');
    }
    const linkedEvent = await dbService.getEventById(eventId.trim());
    if (!linkedEvent) {
      return apiError(ErrorCodes.EVENT_NOT_FOUND, 'The selected event was not found in the database.', 404);
    }
    if (linkedEvent.status !== 'APPROVED') {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Expenses can only be recorded for approved events. Selected event has status '${linkedEvent.status}'.`
      );
    }

    // 6. Validate Description (required, max 200 characters)
    if (!description || !description.trim()) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Description is required.');
    }
    if (description.trim().length > 200) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Description cannot exceed 200 characters. Currently ${description.trim().length} characters.`
      );
    }

    // 7. Validate Receipt requirement (Required for expenses over ₹500, optional below that)
    if (numAmount > 500) {
      if (!receiptUrl || !receiptUrl.trim()) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          'Receipt upload is required for any expense over ₹500.',
          400
        );
      }
    }

    // 8. Check semester budget impact (₹50,000 threshold)
    // "If an expense would push the total spent above ₹50,000, still allow it but show a red warning: ‘This exceeds the semester budget by ₹X’."
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

    // 9. Resolve Submitter & Added By Name
    let finalSubmitterId = submittedById;
    if (!finalSubmitterId) {
      const defaultUser = await dbService.getUserByEmail('pardhu120907@gmail.com');
      finalSubmitterId = defaultUser ? defaultUser.id : 'user-pardhu';
    }

    const finalAddedByName =
      addedByName ||
      (effectiveRole === UserRole.CORE_VERIFIER || effectiveRole === 'ACM_CORE'
        ? 'ACM Core'
        : 'Club Executive');

    // 10. Persist Expense in database linked to event and receipt
    const createdExpense = await dbService.createExpense({
      eventId: linkedEvent.id,
      amount: numAmount,
      category,
      description: description.trim(),
      expenseDate: finalDate,
      receiptUrl: receiptUrl || null,
      receiptPublicId: receiptPublicId || null,
      receiptFileName: receiptFileName || null,
      submittedById: finalSubmitterId,
      addedByName: finalAddedByName,
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
