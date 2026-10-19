import { NextRequest } from 'next/server';
import { clearSessionCookieHeader } from '@/lib/auth';
import { apiSuccess } from '@/lib/constants';

export async function POST(request: NextRequest) {
  const response = apiSuccess({ message: 'Logged out successfully' });
  response.headers.set('Set-Cookie', clearSessionCookieHeader());
  return response;
}
