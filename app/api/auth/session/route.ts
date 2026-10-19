import { NextRequest } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { apiSuccess } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const user = await getServerUser(request);
  return apiSuccess({ user });
}
