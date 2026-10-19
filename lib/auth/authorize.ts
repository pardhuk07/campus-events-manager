import { auth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";

/**
 * Call this at the top of any API route to require authentication
 * and optionally restrict to specific roles.
 *
 * Usage:
 *   const { authorized, session, response } = await requireRole(["CORE_VERIFIER"]);
 *   if (!authorized) return response;
 */
export async function requireRole(allowedRoles?: UserRole[]) {
  const session = await auth();

  if (!session || !session.user) {
    return {
      authorized: false as const,
      session: null,
      response: NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (session.user as any).role as UserRole;
    if (!allowedRoles.includes(userRole)) {
      return {
        authorized: false as const,
        session: null,
        response: NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to perform this action",
            },
          },
          { status: 403 }
        ),
      };
    }
  }

  return { authorized: true as const, session, response: null };
}
