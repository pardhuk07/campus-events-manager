import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes, UserRole } from '@/lib/constants';

// GET /api/notifications - ACM Core Only
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole') || request.headers.get('x-user-role');

    // STRICT RBAC ENFORCEMENT: ACM Core role only
    if (userRole !== UserRole.CORE_VERIFIER && userRole !== 'ACM_CORE') {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Access denied: The notification feed is strictly restricted to ACM Core members.',
        403
      );
    }

    const data = await dbService.getNotifications(50);
    return apiSuccess(data);
  } catch (error: any) {
    console.error('GET /api/notifications error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch notifications', 500);
  }
}

// PATCH /api/notifications - Mark as read / Mark all as read (ACM Core Only)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, all, userRole } = body;

    const effectiveRole = userRole || request.headers.get('x-user-role');
    if (effectiveRole !== UserRole.CORE_VERIFIER && effectiveRole !== 'ACM_CORE') {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'Access denied: The notification feed is strictly restricted to ACM Core members.',
        403
      );
    }

    if (all) {
      await dbService.markAllNotificationsAsRead();
      const data = await dbService.getNotifications(50);
      return apiSuccess({ message: 'All notifications marked as read', ...data });
    }

    if (id) {
      const updated = await dbService.markNotificationAsRead(id);
      const data = await dbService.getNotifications(50);
      return apiSuccess({ message: 'Notification marked as read', updated, ...data });
    }

    return apiError(ErrorCodes.VALIDATION_ERROR, 'Notification ID or "all: true" is required.');
  } catch (error: any) {
    console.error('PATCH /api/notifications error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to update notification', 500);
  }
}
