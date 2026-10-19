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

// GET /api/expenses/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expense = await dbService.getExpenseById(id);

    if (!expense) {
      return apiError(ErrorCodes.EXPENSE_NOT_FOUND, 'Expense record not found.', 404);
    }

    return apiSuccess(expense);
  } catch (error: any) {
    console.error('GET /api/expenses/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}

// PATCH /api/expenses/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // RBAC: Only Executives and Core can modify expenses
    const auth = await requireExecOrCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const user = auth.user;

    const existing = await dbService.getExpenseById(id);
    if (!existing) {
      return apiError(ErrorCodes.EXPENSE_NOT_FOUND, 'Expense record not found.', 404);
    }

    // If Club Executive, verify they own the expense or the linked event belongs to their club
    if (user.role === UserRole.CLUB_EXEC && user.clubId) {
      const linkedEvent = await dbService.getEventById(existing.eventId);
      if (linkedEvent && linkedEvent.clubId !== user.clubId && existing.submittedById !== user.id) {
        return apiError(
          ErrorCodes.FORBIDDEN,
          'Access denied: You cannot modify expenses belonging to another club.',
          403
        );
      }
    }

    const body = await request.json();
    const { amount, category, description, expenseDate, receiptUrl, receiptPublicId, eventId } = body;

    const updates: any = {};
    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return apiError(ErrorCodes.INVALID_EXPENSE_AMOUNT, 'Amount must be greater than zero.', 400);
      }
      updates.amount = numAmount;
    }

    if (category) {
      if (!Object.values(ExpenseCategory).includes(category)) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid category.', 400);
      }
      updates.category = category;
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || !description.trim() || description.trim().length > 200) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Description must be between 1 and 200 characters.', 400);
      }
      updates.description = description.trim();
    }

    if (expenseDate) {
      const d = new Date(expenseDate);
      if (isNaN(d.getTime())) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid expense date.', 400);
      }
      updates.expenseDate = d;
    }

    if (receiptUrl !== undefined) updates.receiptUrl = receiptUrl;
    if (receiptPublicId !== undefined) updates.receiptPublicId = receiptPublicId;
    if (eventId !== undefined) updates.eventId = eventId;

    const updated = await dbService.updateExpense(id, updates);
    return apiSuccess(updated);
  } catch (error: any) {
    console.error('PATCH /api/expenses/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}

// DELETE /api/expenses/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // RBAC: Only Executives and Core can delete expenses
    const auth = await requireExecOrCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }
    const user = auth.user;

    const existing = await dbService.getExpenseById(id);
    if (!existing) {
      return apiError(ErrorCodes.EXPENSE_NOT_FOUND, 'Expense record not found.', 404);
    }

    if (user.role === UserRole.CLUB_EXEC && user.clubId) {
      const linkedEvent = await dbService.getEventById(existing.eventId);
      if (linkedEvent && linkedEvent.clubId !== user.clubId && existing.submittedById !== user.id) {
        return apiError(
          ErrorCodes.FORBIDDEN,
          'Access denied: You cannot delete expenses belonging to another club.',
          403
        );
      }
    }

    const deleted = await dbService.deleteExpense(id);
    if (!deleted) {
      return apiError(ErrorCodes.EXPENSE_NOT_FOUND, 'Expense record not found.', 404);
    }

    return apiSuccess({ id, deleted: true });
  } catch (error: any) {
    console.error('DELETE /api/expenses/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}
