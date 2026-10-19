import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes, CAMPUS_CLUBS } from '@/lib/constants';

export async function GET() {
  try {
    const clubs = await dbService.getClubs();
    if (clubs && clubs.length > 0) {
      return apiSuccess(clubs);
    }
    return apiSuccess(CAMPUS_CLUBS);
  } catch (error: any) {
    console.error('Failed to fetch clubs, returning standard list:', error);
    return apiSuccess(CAMPUS_CLUBS);
  }
}
