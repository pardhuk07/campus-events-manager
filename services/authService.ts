import { prisma, Role } from '@/lib/prisma';

// Official pre-registered Core & Executive members
export const PRE_REGISTERED_USERS = [
  {
    email: 'pardhu120907@gmail.com',
    name: 'Pardhu (Core Lead)',
    role: Role.ACM_CORE,
    password: 'password123',
  },
  {
    email: 'acmcore@gmail.com',
    name: 'ACM Core Admin',
    role: Role.ACM_CORE,
    password: 'password123',
  },
  {
    email: 'acmexec@gmail.com',
    name: 'Club Executive',
    role: Role.CLUB_EXEC,
    password: 'password123',
  },
  {
    email: 'ieeelead@gmail.com',
    name: 'IEEE Executive',
    role: Role.CLUB_EXEC,
    password: 'password123',
  },
];

/**
 * Verify user credentials from database & pre-registered list
 */
export async function verifyUserCredentials(
  email: string,
  password?: string,
  selectedRole?: 'ACM_CORE' | 'CLUB_EXEC'
) {
  const normalizedEmail = email.trim().toLowerCase();

  // Check in pre-registered list first
  const preReg = PRE_REGISTERED_USERS.find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );

  // Default allowed passcodes for hackathon demonstration
  const validPasscodes = ['password123', 'acm123', 'core123', 'admin123'];

  // Check if password matches or matches demo passcode
  const isPasswordValid =
    password &&
    (password.length >= 4 && (validPasscodes.includes(password) || (preReg && preReg.password === password)));

  if (!isPasswordValid) {
    return {
      success: false,
      error: 'Invalid password. (Use demo password: password123 or acm123)',
    };
  }

  // Determine role
  let role: Role = Role.MEMBER;
  let name = normalizedEmail.split('@')[0];

  if (preReg) {
    role = preReg.role;
    name = preReg.name;
  } else if (normalizedEmail.includes('core') || normalizedEmail === 'pardhu120907@gmail.com') {
    role = Role.ACM_CORE;
  } else if (normalizedEmail.includes('exec') || normalizedEmail.includes('lead')) {
    role = Role.CLUB_EXEC;
  } else if (selectedRole) {
    role = selectedRole as Role;
  }

  // Validate that the user is actually authorized for the selected role
  if (selectedRole && role !== selectedRole) {
    return {
      success: false,
      error: `Access Denied: ${normalizedEmail} is not authorized as ${selectedRole}.`,
    };
  }

  // Ensure record exists in PostgreSQL
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { role, name },
    create: { email: normalizedEmail, name, role },
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}
