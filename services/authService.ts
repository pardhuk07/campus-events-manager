import { prisma, Role } from '@/lib/prisma';

// Defined ACM Core & Executive Email lists
// Any other student/public email logging in is automatically a MEMBER.
export const CORE_VERIFIER_EMAILS = [
  'acmcore@gmail.com',
  'core.acm@gmail.com',
  'admin@acm.org',
  'president.acm@gmail.com',
];

export const CLUB_EXEC_EMAILS = [
  'acmexec@gmail.com',
  'ieeelead@gmail.com',
  'csilead@gmail.com',
  'exec@acm.org',
];

/**
 * Determine a user's role from their email address
 */
export function determineRoleFromEmail(email: string): Role {
  const normalized = email.trim().toLowerCase();

  // 1. Check if designated Core email or contains 'core' in acm domain
  if (
    CORE_VERIFIER_EMAILS.includes(normalized) ||
    normalized.startsWith('acmcore') ||
    normalized.endsWith('@acm.org')
  ) {
    return Role.ACM_CORE;
  }

  // 2. Check if designated Club Executive email
  if (
    CLUB_EXEC_EMAILS.includes(normalized) ||
    normalized.includes('exec') ||
    normalized.includes('lead')
  ) {
    return Role.CLUB_EXEC;
  }

  // 3. All other verified student / public Gmails are Regular Members
  return Role.MEMBER;
}

/**
 * Verify or Register User in Database based on their Gmail
 */
export async function authenticateGmailUser(email: string, name?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const determinedRole = determineRoleFromEmail(normalizedEmail);

  // Upsert user in PostgreSQL so they are permanently tracked
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      role: determinedRole,
      name: name || normalizedEmail.split('@')[0],
    },
    create: {
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      role: determinedRole,
    },
  });

  return user;
}
