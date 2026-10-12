import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
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
    const body = await request.json();
    const { amount, category, description, expenseDate, receiptUrl, receiptPublicId, eventId, userRole } = body;

    // RBAC: Members cannot modify expenses
    if (userRole === UserRole.MEMBER) {
      return apiError(ErrorCodes.FORBIDDEN, 'Members cannot modify expenses.', 403);
    }

    const existing = await dbService.getExpenseById(id);
    if (!existing) {
      return apiError(ErrorCodes.EXPENSE_NOT_FOUND, 'Expense record not found.', 404);
    }

    const updates: any = {};
    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return apiError(ErrorCodes.INVALID_EXPENSE_AMOUNT, 'Amount must be greater than zero.');
      }
      updates.amount = numAmount;
    }
    if (category) {
      if (!Object.values(ExpenseCategory).includes(category)) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid category.');
      }
      updates.category = category;
    }
    if (description !== undefined) updates.description = description;
    if (expenseDate) updates.expenseDate = new Date(expenseDate);
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
    const body = await request.json().catch(() => ({}));
    const { userRole } = body;

    if (userRole === UserRole.MEMBER) {
      return apiError(ErrorCodes.FORBIDDEN, 'Members cannot delete expenses.', 403);
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
