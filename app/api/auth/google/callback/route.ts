import { NextRequest } from 'next/server';
import { processGoogleCallback } from '@/lib/googleOAuth';

export async function GET(request: NextRequest) {
  return processGoogleCallback(request, '/api/auth/google/callback');
}
