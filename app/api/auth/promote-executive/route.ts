import { NextRequest } from 'next/server';
import { getServerUser, createSessionToken, createSessionCookieHeader } from '@/lib/auth';
import { dbService } from '@/lib/dbService';
import { apiSuccess, apiError, ErrorCodes, UserRole, CAMPUS_CLUBS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { clubId, email: bodyEmail } = body;

    // 1. Identify User from session or fallback
    let user = await getServerUser(request);

    if (!user && bodyEmail) {
      const normalizedEmail = bodyEmail.trim().toLowerCase();
      const dbUser = await dbService.getUserByEmail(normalizedEmail);
      if (dbUser) {
        user = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role as UserRole,
          clubId: dbUser.clubId,
        };
      }
    }

    if (!user) {
      return apiError(
        ErrorCodes.UNAUTHORIZED,
        'Please sign in to select a club or promote your account.',
        401
      );
    }

    // 2. Validate Selected Club
    if (!clubId || typeof clubId !== 'string') {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'Please select a valid club from the list.',
        400
      );
    }

    const matchedClub = CAMPUS_CLUBS.find(
      (c) => c.id === clubId || c.name.toLowerCase() === clubId.toLowerCase() || c.shortName.toLowerCase() === clubId.toLowerCase()
    );

    if (!matchedClub) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Club "${clubId}" is not in the list of recognized campus clubs.`,
        400
      );
    }

    // 3. Do not demote Core Verifiers
    if (user.role === UserRole.CORE_VERIFIER) {
      return apiError(
        ErrorCodes.FORBIDDEN,
        'ACM Core Verifiers manage all clubs and cannot be restricted to a single club.',
        403
      );
    }

    // 4. Update / Upsert User with CLUB_EXEC role and assigned clubId
    const formattedName =
      user.name && !user.name.includes('@') && user.name !== 'General Member'
        ? user.name
        : `${matchedClub.shortName} Executive`;

    const updatedDbUser = await dbService.upsertUser({
      id: user.id,
      name: formattedName,
      email: user.email.toLowerCase().trim(),
      role: UserRole.CLUB_EXEC,
      clubId: matchedClub.id,
    });

    // 5. Generate fresh session token & cookie
    const token = createSessionToken(updatedDbUser.email);
    const cookieHeader = createSessionCookieHeader(token);

    const response = apiSuccess({
      message: `Successfully promoted to ${matchedClub.name} Executive!`,
      user: {
        id: updatedDbUser.id,
        name: updatedDbUser.name,
        email: updatedDbUser.email,
        role: UserRole.CLUB_EXEC,
        clubId: matchedClub.id,
      },
      club: matchedClub,
    });

    response.headers.set('Set-Cookie', cookieHeader);
    return response;
  } catch (error: any) {
    console.error('POST /api/auth/promote-executive error:', error);
    return apiError(
      ErrorCodes.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to promote member to executive',
      500
    );
  }
}
