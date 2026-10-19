import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes, UserRole } from '@/lib/constants';
import { CORE_EMAILS, createSessionToken, createSessionCookieHeader } from '@/lib/auth';

// Pre-registered users and passwords
export const PRE_REGISTERED_USERS = [
  {
    email: 'pardhu120907@gmail.com',
    name: 'Pardhu (Core Lead)',
    role: UserRole.CORE_VERIFIER,
    password: 'password123',
    clubId: null,
  },
  {
    email: 'acmcore@gmail.com',
    name: 'ACM Core Admin',
    role: UserRole.CORE_VERIFIER,
    password: 'password123',
    clubId: null,
  },
  {
    email: 'acmexec@gmail.com',
    name: 'Club Executive',
    role: UserRole.CLUB_EXEC,
    password: 'password123',
    clubId: null,
  },
  {
    email: 'ieeelead@gmail.com',
    name: 'IEEE Executive',
    role: UserRole.CLUB_EXEC,
    password: 'password123',
    clubId: null,
  },
  {
    email: 'student@gmail.com',
    name: 'General Member',
    role: UserRole.MEMBER,
    password: 'password123',
    clubId: null,
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, selectedRole } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Please enter a valid Gmail / student email.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find in pre-registered table
    const preReg = PRE_REGISTERED_USERS.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    const validPasscodes = ['password123', 'acm123', 'core123', 'admin123'];
    const isPasswordValid =
      password &&
      (validPasscodes.includes(password) || (preReg && preReg.password === password));

    if (!isPasswordValid) {
      return apiError(
        ErrorCodes.UNAUTHORIZED,
        'Invalid password. (For testing use demo password: password123 or acm123)',
        401
      );
    }

    // SERVER-SIDE ROLE DETERMINATION: Never from request body or client state!
    let role: UserRole = UserRole.MEMBER;
    let name = normalizedEmail.split('@')[0];

    // 1. Check Core Email Allowlist
    if (CORE_EMAILS.some((e) => e.toLowerCase() === normalizedEmail)) {
      role = UserRole.CORE_VERIFIER;
      name = 'ACM Core Lead';
    } else if (preReg) {
      role = preReg.role;
      name = preReg.name;
    } else {
      // 2. Check Database record
      const existingDbUser = await dbService.getUserByEmail(normalizedEmail);
      if (existingDbUser) {
        if (existingDbUser.role === UserRole.CORE_VERIFIER) {
          role = UserRole.CORE_VERIFIER;
        } else if (existingDbUser.role === UserRole.CLUB_EXEC) {
          role = UserRole.CLUB_EXEC;
        } else {
          role = UserRole.MEMBER;
        }
        name = existingDbUser.name;
      } else {
        // Unknown users default to MEMBER
        role = UserRole.MEMBER;
      }
    }

    // Role verification check if selected in UI
    if (selectedRole && role !== selectedRole) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        `Access Denied: ${normalizedEmail} is not registered as ${selectedRole}.`,
        403
      );
    }

    // Dynamically lookup the actual Club ID from the database for Club Executives only
    let resolvedClubId: string | null = null;
    if (role === UserRole.CLUB_EXEC) {
      try {
        const clubs = await dbService.getClubs();
        if (normalizedEmail.includes('ieee')) {
          const ieeeClub = clubs.find((c: any) => c.name.toLowerCase().includes('ieee'));
          resolvedClubId = ieeeClub ? ieeeClub.id : (clubs[0]?.id || null);
        } else {
          const acmClub = clubs.find((c: any) => c.name.toLowerCase().includes('acm'));
          resolvedClubId = acmClub ? acmClub.id : (clubs[0]?.id || null);
        }
      } catch (e) {
        console.warn('Could not query clubs for user assignment:', e);
      }
    }

    // Upsert user into database
    const user = await dbService.upsertUser({
      name,
      email: normalizedEmail,
      role,
      clubId: resolvedClubId,
    });

    // Create cryptographically signed HTTP-only session token
    const token = createSessionToken(user.email);
    const cookieHeader = createSessionCookieHeader(token);

    const response = apiSuccess({
      message: `Verified successfully as ${user.role}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clubId: user.clubId,
      },
    });

    response.headers.set('Set-Cookie', cookieHeader);
    return response;
  } catch (error: any) {
    console.error('POST /api/auth/login error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Login failed', 500);
  }
}
