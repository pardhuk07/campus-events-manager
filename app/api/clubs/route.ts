import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes } from '@/lib/constants';

export async function GET() {
  try {
    const clubs = await dbService.getClubs();
    return apiSuccess(clubs);
  } catch (error: any) {
    console.error('Failed to fetch clubs:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch clubs', 500);
  }
}
