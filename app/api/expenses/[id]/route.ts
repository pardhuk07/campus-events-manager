import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { budgetService } from '@/lib/budgetService';
import { getServerUser } from '@/lib/auth';
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
    const user = await getServerUser(request);
    const userRole = user?.role || UserRole.MEMBER;

    if (!user || userRole === UserRole.MEMBER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Forbidden: Expense details are restricted from member and public access.',
        403
      );
    }

    const expense = await dbService.getExpenseById(id);
    if (!expense) {
      return apiError(ErrorCodes.EXPENSE_NOT_FOUND, 'Expense record not found.', 404);
    }

    if (userRole === UserRole.CLUB_EXEC && user.clubId) {
      if (expense.clubId && expense.clubId !== user.clubId) {
        return apiError(
          ErrorCodes.FORBIDDEN,
          'Forbidden: You cannot view expenses from other clubs.',
          403
        );
      }
    }

    return apiSuccess(expense);
  } catch (error: any) {
    console.error('GET /api/expenses/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}

// PATCH /api/expenses/:id
// Core can edit an existing expense (amount, category, date, description, event within the same club, replace receipt) with a required reason.
// Executives cannot edit expenses.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getServerUser(request);

    if (!user || user.role === UserRole.MEMBER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Forbidden: Public and members cannot modify expenses.',
        403
      );
    }

    // Executives cannot edit expenses
    if (user.role === UserRole.CLUB_EXEC) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Forbidden: Executives cannot edit existing expenses. Only ACM Core can edit expenses.',
        403
      );
    }

    if (user.role !== UserRole.CORE_VERIFIER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Forbidden: Only ACM Core can edit expenses.',
        403
      );
    }

    const existing = await dbService.getExpenseById(id);
    if (!existing) {
      return apiError(ErrorCodes.EXPENSE_NOT_FOUND, 'Expense record not found.', 404);
    }

    if (existing.isVoided) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'Cannot edit an expense that has already been voided.',
        400
      );
    }

    const body = await request.json().catch(() => ({}));
    const { amount, category, description, expenseDate, receiptUrl, receiptPublicId, receiptFileName, eventId, reason } = body;

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'A reason is strictly required to edit an expense.',
        400
      );
    }

    if (category && !Object.values(ExpenseCategory).includes(category)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid category.', 400);
    }

    let clubName = existing.onBehalfOfClub;
    if (!clubName && existing.clubId) {
      const club = await dbService.getClubById(existing.clubId);
      clubName = club?.name || existing.clubId;
    }

    const updated = await budgetService.editExpense(
      id,
      {
        amount: amount !== undefined ? Number(amount) : undefined,
        category,
        description,
        expenseDate,
        eventId,
        receiptUrl,
        receiptPublicId,
        receiptFileName,
      },
      {
        performedBy: user.name || 'ACM Core',
        performedById: user.id,
        reason: reason.trim(),
        onBehalfOfClub: clubName,
      }
    );

    return apiSuccess(updated);
  } catch (error: any) {
    console.error('PATCH /api/expenses/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}

// DELETE /api/expenses/:id
// Core can void an expense with a required reason. Never hard-delete.
// Executives cannot void anything.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getServerUser(request);

    if (!user || user.role === UserRole.MEMBER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Forbidden: Public and members cannot void expenses.',
        403
      );
    }

    if (user.role === UserRole.CLUB_EXEC) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Forbidden: Executives cannot void or delete expenses. Only ACM Core can void expenses.',
        403
      );
    }

    if (user.role !== UserRole.CORE_VERIFIER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Forbidden: Only ACM Core can void expenses.',
        403
      );
    }

    const existing = await dbService.getExpenseById(id);
    if (!existing) {
      return apiError(ErrorCodes.EXPENSE_NOT_FOUND, 'Expense record not found.', 404);
    }

    if (existing.isVoided) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'Expense is already voided.',
        400
      );
    }

    // Try reading reason from body or query params
    let reason = '';
    try {
      const body = await request.json();
      reason = body?.reason || '';
    } catch {
      // Body might be empty in DELETE, try query param
      const url = new URL(request.url);
      reason = url.searchParams.get('reason') || '';
    }

    if (!reason || !reason.trim()) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'A reason is strictly required to void an expense.',
        400
      );
    }

    let clubName = existing.onBehalfOfClub;
    if (!clubName && existing.clubId) {
      const club = await dbService.getClubById(existing.clubId);
      clubName = club?.name || existing.clubId;
    }

    const voidedExpense = await budgetService.voidExpense(id, {
      performedBy: user.name || 'ACM Core',
      performedById: user.id,
      reason: reason.trim(),
      onBehalfOfClub: clubName,
    });

    return apiSuccess({
      id,
      voided: true,
      deleted: true, // For backward compatibility
      expense: voidedExpense,
    });
  } catch (error: any) {
    console.error('DELETE /api/expenses/:id error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}
