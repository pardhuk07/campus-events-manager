import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes, UserRole, CAMPUS_CLUBS } from '@/lib/constants';
import { CORE_EMAILS, createSessionToken, createSessionCookieHeader } from '@/lib/auth';

// Pre-registered demo accounts
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
    name: 'ACM Executive',
    role: UserRole.CLUB_EXEC,
    password: 'password123',
    clubId: 'club-acm',
  },
  {
    email: 'chesexec@gmail.com',
    name: 'ChES Executive',
    role: UserRole.CLUB_EXEC,
    password: 'password123',
    clubId: 'club-ches',
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
    const { email, password, selectedRole, clubId } = body;

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

    // SERVER-SIDE ROLE & CLUB DETERMINATION
    let role: UserRole = UserRole.MEMBER;
    let name = normalizedEmail.split('@')[0];

    // 1. Check Core Email Allowlist
    if (CORE_EMAILS.some((e) => e.toLowerCase() === normalizedEmail)) {
      role = UserRole.CORE_VERIFIER;
      name = 'ACM Core Lead';
    } else if (selectedRole === UserRole.CLUB_EXEC) {
      role = UserRole.CLUB_EXEC;
    } else if (preReg) {
      role = preReg.role;
      name = preReg.name;
    } else {
      // 2. Check Database record
      let existingDbUser: any = null;
      try {
        existingDbUser = await dbService.getUserByEmail(normalizedEmail);
      } catch {
        // Fallback
      }
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
        role = UserRole.MEMBER;
      }
    }

    // Role verification check if selected in UI
    if (selectedRole && selectedRole !== UserRole.CLUB_EXEC && role !== selectedRole) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        `Access Denied: ${normalizedEmail} is not registered as ${selectedRole}.`,
        403
      );
    }

    // Resolve assigned club for Club Executives (from the 10 official clubs)
    let resolvedClubId: string | null = null;
    if (role === UserRole.CLUB_EXEC) {
      if (clubId) {
        const matchedClub = CAMPUS_CLUBS.find(
          (c) => c.id === clubId || c.name.toLowerCase() === clubId.toLowerCase()
        );
        resolvedClubId = matchedClub ? matchedClub.id : clubId;
        if (matchedClub) {
          name = `${matchedClub.shortName} Executive`;
        }
      } else if (preReg?.clubId) {
        resolvedClubId = preReg.clubId;
      } else {
        resolvedClubId = 'club-acm';
      }
    }

    // Upsert user into database with assigned club
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
