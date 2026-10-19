import { NextRequest, NextResponse } from 'next/server';
import { getGoogleOAuthUrl } from '@/lib/googleOAuth';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/';
  const callbackPath = request.nextUrl.searchParams.get('callbackPath') || '/api/auth/callback/google';

  const googleUrl = getGoogleOAuthUrl(origin, callbackPath, callbackUrl);
  return NextResponse.redirect(googleUrl);
}
