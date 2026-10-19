import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes } from '@/lib/constants';
import { requireCore } from '@/lib/auth';

// GET /api/notifications - ACM Core Only
export async function GET(request: NextRequest) {
  try {
    // STRICT RBAC ENFORCEMENT: ACM Core role only
    const auth = await requireCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
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
    // STRICT RBAC ENFORCEMENT: ACM Core role only
    const auth = await requireCore(request);
    if ('errorResponse' in auth) {
      return auth.errorResponse;
    }

    const body = await request.json();
    const { id, all } = body;

    if (all) {
      await dbService.markAllNotificationsAsRead();
      const data = await dbService.getNotifications(50);
      return apiSuccess({ message: 'All notifications marked as read', ...data });
    }

    if (id) {
      if (typeof id !== 'string') {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid notification ID.', 400);
      }
      const updated = await dbService.markNotificationAsRead(id);
      const data = await dbService.getNotifications(50);
      return apiSuccess({ message: 'Notification marked as read', updated, ...data });
    }

    return apiError(ErrorCodes.VALIDATION_ERROR, 'Notification ID or "all: true" is required.', 400);
  } catch (error: any) {
    console.error('PATCH /api/notifications error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to update notification', 500);
  }
}
