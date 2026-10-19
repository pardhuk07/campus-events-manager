import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { budgetService } from '@/lib/budgetService';
import { getServerUser } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  ErrorCodes,
  UserRole,
} from '@/lib/constants';

// GET /api/expenses/:id/history
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
        'Forbidden: Expense history is restricted from member and public access.',
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
          'Forbidden: You cannot view expense history from other clubs.',
          403
        );
      }
    }

    const history = await budgetService.getExpenseHistory(id);
    return apiSuccess({
      expenseId: id,
      history,
    });
  } catch (error: any) {
    console.error('GET /api/expenses/:id/history error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Server error', 500);
  }
}
