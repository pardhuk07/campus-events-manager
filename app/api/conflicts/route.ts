import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes } from '@/lib/constants';

// GET /api/conflicts - List all event conflicts
export async function GET() {
  try {
    const conflicts = await dbService.getConflicts();
    return apiSuccess(conflicts);
  } catch (error: any) {
    console.error('GET /api/conflicts error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch conflicts', 500);
  }
}
