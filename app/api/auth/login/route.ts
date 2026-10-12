import { NextRequest } from 'next/server';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes, UserRole } from '@/lib/constants';

// Pre-registered users and passwords per hackathon requirement
export const PRE_REGISTERED_USERS = [
  {
    email: 'pardhu120907@gmail.com',
    name: 'Pardhu (Core Lead)',
    role: UserRole.CORE_VERIFIER,
    password: 'password123',
    clubId: 'club-acm',
  },
  {
    email: 'acmcore@gmail.com',
    name: 'ACM Core Admin',
    role: UserRole.CORE_VERIFIER,
    password: 'password123',
    clubId: 'club-acm',
  },
  {
    email: 'acmexec@gmail.com',
    name: 'Club Executive',
    role: UserRole.CLUB_EXEC,
    password: 'password123',
    clubId: 'club-acm',
  },
  {
    email: 'ieeelead@gmail.com',
    name: 'IEEE Executive',
    role: UserRole.CLUB_EXEC,
    password: 'password123',
    clubId: 'club-ieee',
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

    if (!email || !email.includes('@')) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Please enter a valid Gmail / student email.');
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

    let role: UserRole = UserRole.MEMBER;
    let name = normalizedEmail.split('@')[0];
    let clubId: string | null = null;

    if (preReg) {
      role = preReg.role;
      name = preReg.name;
      clubId = preReg.clubId;
    } else if (normalizedEmail.includes('core') || normalizedEmail === 'pardhu120907@gmail.com') {
      role = UserRole.CORE_VERIFIER;
    } else if (normalizedEmail.includes('exec') || normalizedEmail.includes('lead')) {
      role = UserRole.CLUB_EXEC;
    } else if (selectedRole) {
      role = selectedRole as UserRole;
    }

    // Role verification check if selected in UI
    if (selectedRole && role !== selectedRole) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        `Access Denied: ${normalizedEmail} is not registered as ${selectedRole}.`,
        403
      );
    }

    // Dynamically lookup the actual Club ID from the database
    let resolvedClubId: string | null = null;
    try {
      const clubs = await dbService.getClubs();
      const acmClub = clubs.find((c: any) => c.name.toLowerCase().includes('acm'));
      resolvedClubId = acmClub ? acmClub.id : (clubs[0]?.id || null);
    } catch (e) {
      console.warn('Could not query clubs for user assignment:', e);
    }

    // Upsert user into database
    const user = await dbService.upsertUser({
      name,
      email: normalizedEmail,
      role,
      clubId: resolvedClubId,
    });

    return apiSuccess({
      message: `Verified successfully as ${role}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clubId: user.clubId,
      },
    });
  } catch (error: any) {
    console.error('POST /api/auth/login error:', error);
    return apiError(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Login failed', 500);
  }
}
