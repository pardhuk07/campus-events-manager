import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { getServerUser } from '@/lib/auth';
import { apiSuccess, apiError, ErrorCodes, UserRole } from '@/lib/constants';

// GET /api/conflicts - List all event conflicts (Executives and Core)
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser(request);
    const userRole = user?.role || UserRole.MEMBER;

    // Members cannot view internal active conflict queues
    if (userRole === UserRole.MEMBER) {
      return apiSuccess([]);
    }

    let conflicts = await dbService.getConflicts();
    if (userRole === UserRole.CLUB_EXEC) {
      conflicts = conflicts.filter(
        (c: any) =>
          (user?.clubId && c.event?.clubId === user.clubId) ||
          (user?.clubId && c.conflictingEvent?.clubId === user.clubId)
      );
    }
    return apiSuccess(conflicts);
  } catch (error: any) {
    console.error('GET /api/conflicts error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch conflicts', 500);
  }
}
