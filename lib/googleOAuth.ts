import { NextRequest, NextResponse } from 'next/server';
import { CORE_EMAILS, createSessionToken, createSessionCookieHeader } from './auth';
import { dbService } from './dbService';
import { UserRole } from './constants';

function cleanEnvVar(val: string | undefined): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

export function getGoogleOAuthUrl(origin: string, callbackPath = '/api/auth/callback/google', state = '/'): string {
  const clientId = cleanEnvVar(process.env.GOOGLE_CLIENT_ID);
  const redirectUri = `${origin}${callbackPath}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function processGoogleCallback(request: NextRequest, callbackPath = '/api/auth/callback/google') {
  const origin = request.nextUrl.origin;
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state') || '/';

  if (error || !code) {
    console.error('Google OAuth error from Google:', error);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error || 'Google login was cancelled or failed')}`
    );
  }

  const clientId = cleanEnvVar(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnvVar(process.env.GOOGLE_CLIENT_SECRET);
  const redirectUri = `${origin}${callbackPath}`;

  if (!clientId || !clientSecret) {
    console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment');
    return NextResponse.redirect(`${origin}/login?error=MissingGoogleCredentials`);
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Failed to exchange code with Google:', tokenData);
      return NextResponse.redirect(`${origin}/login?error=InvalidTokenResponse`);
    }

    // 2. Fetch user profile from Google UserInfo endpoint
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(`${origin}/login?error=FailedToFetchProfile`);
    }

    const profile = await profileRes.json();
    const email = profile.email?.toLowerCase()?.trim();
    if (!email) {
      return NextResponse.redirect(`${origin}/login?error=NoEmailProvided`);
    }

    const name = profile.name || email.split('@')[0];

    // 3. Server-side role assignment
    let role: UserRole = UserRole.MEMBER;
    const isCore = CORE_EMAILS.some((e) => e.toLowerCase() === email);
    if (isCore) {
      role = UserRole.CORE_VERIFIER;
    } else if (email === 'acmexec@gmail.com') {
      role = UserRole.CLUB_EXEC;
    } else {
      try {
        const existing = await dbService.getUserByEmail(email);
        if (existing?.role) {
          role = existing.role as UserRole;
        }
      } catch (err) {
        console.warn('DB lookup during Google auth fallback:', err);
      }
    }

    // 4. Upsert user in database
    const user = await dbService.upsertUser({
      name,
      email,
      role,
      clubId: role === UserRole.CLUB_EXEC ? 'club-acm' : null,
    });

    // 5. Generate secure session token & HTTP-only cookie
    const token = createSessionToken(user.email);
    const cookieHeader = createSessionCookieHeader(token);

    // Target destination
    const targetUrl = state.startsWith('/') ? `${origin}${state}` : `${origin}/`;
    const response = NextResponse.redirect(targetUrl);
    response.headers.set('Set-Cookie', cookieHeader);
    return response;
  } catch (err: any) {
    console.error('processGoogleCallback exception:', err);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(err.message || 'Authentication error')}`
    );
  }
}
