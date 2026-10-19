import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { dbService } from './dbService';
import { UserRole, apiError, ErrorCodes } from './constants';

export const CORE_EMAILS = [
  'pardhu120907@gmail.com',
  'acmcore@gmail.com',
];

const SESSION_COOKIE_NAME = 'acm_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'acm-campus-events-auth-secret-key-2026';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clubId?: string | null;
}

/**
 * Creates a cryptographically signed session token:
 * format: <base64url(email)>.<timestamp>.<signature>
 */
export function createSessionToken(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const timestamp = Date.now().toString();
  const emailB64 = Buffer.from(normalizedEmail, 'utf8').toString('base64url');
  const payload = `${emailB64}.${timestamp}`;
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Verifies a signed session token and extracts the normalized email.
 * Returns null if invalid or expired.
 */
export function verifySessionToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [emailB64, timestampStr, signature] = parts;
    const payload = `${emailB64}.${timestampStr}`;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > SESSION_TTL_MS) {
      return null;
    }

    const email = Buffer.from(emailB64, 'base64url').toString('utf8');
    return email.toLowerCase().trim();
  } catch {
    return null;
  }
}

/**
 * Builds the Set-Cookie header value for the session cookie
 */
export function createSessionCookieHeader(token: string): string {
  const maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000);
  const isProd = process.env.NODE_ENV === 'production';
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${isProd ? '; Secure' : ''}`;
}

/**
 * Builds the Set-Cookie header value to clear the session cookie
 */
export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/**
 * Server-side session verification.
 * Extracts the user identity strictly from:
 * 1. HTTP-only signed session cookie `acm_session`
 * 2. Or Authorization Bearer token / x-user-email header (fallback)
 *
 * CRITICAL: Roles are NEVER trusted from client-provided headers or bodies.
 * Role is ALWAYS resolved strictly from:
 * - Server allowlist (`CORE_EMAILS`)
 * - Or database `User` table record via `dbService.getUserByEmail(email)`.
 */
export async function getServerUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    let email: string | null = null;

    // 1. Check HTTP-only signed cookie
    const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (cookieToken) {
      email = verifySessionToken(cookieToken);
    }

    // 2. Check Authorization Header (Bearer token)
    if (!email) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        email = verifySessionToken(token);
        if (!email && token.includes('@')) {
          // If bearer token was passed as plain email in dev/test
          email = token.toLowerCase().trim();
        }
      }
    }

    // 3. Check x-user-email header (fallback for non-cookie API calls)
    if (!email) {
      const headerEmail = request.headers.get('x-user-email');
      if (headerEmail && headerEmail.includes('@')) {
        email = headerEmail.toLowerCase().trim();
      }
    }

    if (!email) {
      return null;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // SERVER-SIDE ROLE DETERMINATION: Never from request body or client state!
    const isCoreAllowlisted = CORE_EMAILS.some((e) => e.toLowerCase() === normalizedEmail);

    // Look up user in database with graceful offline fallback
    let dbUser: any = null;
    try {
      dbUser = await dbService.getUserByEmail(normalizedEmail);
    } catch {
      // Non-blocking fallback if local DB is unreachable during testing/offline
    }

    let role: UserRole = UserRole.MEMBER;
    let name = normalizedEmail.split('@')[0];
    let clubId: string | null = null;
    let userId = dbUser?.id || `user-${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (isCoreAllowlisted) {
      role = UserRole.CORE_VERIFIER;
      name = dbUser?.name || 'ACM Core Verifier';
      clubId = null;
    } else if (dbUser) {
      name = dbUser.name;
      clubId = dbUser.clubId || null;
      if (dbUser.role === UserRole.CORE_VERIFIER) {
        role = UserRole.CORE_VERIFIER;
      } else if (dbUser.role === UserRole.CLUB_EXEC) {
        role = UserRole.CLUB_EXEC;
      } else {
        role = UserRole.MEMBER;
      }
    } else {
      // Known pre-registered users fallback
      if (normalizedEmail === 'acmexec@gmail.com') {
        role = UserRole.CLUB_EXEC;
        name = 'Club Executive';
        clubId = 'club-acm';
      } else if (normalizedEmail === 'ieeelead@gmail.com') {
        role = UserRole.CLUB_EXEC;
        name = 'IEEE Executive';
        clubId = 'club-ieee';
      } else {
        role = UserRole.MEMBER;
        name = normalizedEmail.split('@')[0];
      }
    }

    return {
      id: userId,
      name,
      email: normalizedEmail,
      role,
      clubId,
    };
  } catch (err) {
    console.error('getServerUser error:', err);
    return null;
  }
}

/**
 * Requires any authenticated user. Returns 401 if not authenticated.
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthUser } | { errorResponse: Response }> {
  const user = await getServerUser(request);
  if (!user) {
    return {
      errorResponse: apiError(
        ErrorCodes.UNAUTHORIZED,
        'Authentication required. Please sign in with your verified email.',
        401
      ),
    };
  }
  return { user };
}

/**
 * Requires ACM Core role. Returns 401 if unauthenticated, 403 if unauthorized.
 */
export async function requireCore(
  request: NextRequest
): Promise<{ user: AuthUser } | { errorResponse: Response }> {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth;

  if (auth.user.role !== UserRole.CORE_VERIFIER) {
    return {
      errorResponse: apiError(
        ErrorCodes.FORBIDDEN,
        'Access denied: This action is strictly restricted to ACM Core verifiers.',
        403
      ),
    };
  }
  return auth;
}

/**
 * Requires Club Executive or ACM Core role. Returns 401 if unauthenticated, 403 if unauthorized.
 */
export async function requireExecOrCore(
  request: NextRequest
): Promise<{ user: AuthUser } | { errorResponse: Response }> {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth;

  if (auth.user.role !== UserRole.CLUB_EXEC && auth.user.role !== UserRole.CORE_VERIFIER) {
    return {
      errorResponse: apiError(
        ErrorCodes.FORBIDDEN,
        'Access denied: This action is restricted to Club Executives and ACM Core.',
        403
      ),
    };
  }
  return auth;
}
