import { NextRequest } from 'next/server';
import { budgetService } from '@/lib/budgetService';
import { getServerUser } from '@/lib/auth';
import { apiSuccess, apiError, ErrorCodes, UserRole } from '@/lib/constants';

// GET /api/semesters - List all configured academic semesters
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser(request);
    // Budget & semester route permission lockdown: public visitors and regular members get 403
    if (!user || user.role === UserRole.MEMBER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Forbidden: Semester and budget schedules are restricted from member and public view.',
        403
      );
    }

    const semesters = await budgetService.getSemesters();
    return apiSuccess(semesters);
  } catch (error: any) {
    console.error('GET /api/semesters error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch semesters', 500);
  }
}
