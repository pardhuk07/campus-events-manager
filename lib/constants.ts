/**
 * SINGLE SOURCE OF TRUTH - CONSTANTS & ENUMS
 * Shared across all 4 team modules:
 * Person 1: Event Management
 * Person 2: Conflict Detection
 * Person 3: Expenses + Budget
 * Person 4: Auth + Dashboard + Integration
 */

// 1. UserRole
export const UserRole = {
  MEMBER: 'MEMBER',
  CLUB_EXEC: 'CLUB_EXEC',
  CORE_VERIFIER: 'CORE_VERIFIER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// 2. EventStatus
export const EventStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  RESCHEDULE_REQUESTED: 'RESCHEDULE_REQUESTED',
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

// 3. ConflictStatus
export const ConflictStatus = {
  FLAGGED: 'FLAGGED',
  REVIEWED: 'REVIEWED',
  DISMISSED: 'DISMISSED',
  RESOLVED: 'RESOLVED',
} as const;
export type ConflictStatus = (typeof ConflictStatus)[keyof typeof ConflictStatus];

// 4. ExpenseCategory
export const ExpenseCategory = {
  FOOD: 'FOOD',
  VENUE: 'VENUE',
  PRIZES: 'PRIZES',
  MARKETING: 'MARKETING',
  PRINTING: 'PRINTING',
  EQUIPMENT: 'EQUIPMENT',
  TRAVEL: 'TRAVEL',
  MISCELLANEOUS: 'MISCELLANEOUS',
} as const;
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

// 5. BudgetPeriod
export const BudgetPeriod = {
  MONTHLY: 'MONTHLY',
  SEMESTER: 'SEMESTER',
} as const;
export type BudgetPeriod = (typeof BudgetPeriod)[keyof typeof BudgetPeriod];

// 6. Official Campus Clubs
export interface CampusClub {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: string;
  logoUrl?: string;
}

export const CAMPUS_CLUBS: CampusClub[] = [
  {
    id: 'club-acm',
    name: 'ACM',
    shortName: 'ACM',
    description: 'Association for Computing Machinery SVNIT Student Chapter',
    category: 'Technical & Computing',
    logoUrl: '/clubs/acm.png',
  },
  {
    id: 'club-ches',
    name: 'ChES (Chemical Engineering Society of SVNIT Surat)',
    shortName: 'ChES',
    description: 'Chemical Engineering Society of SVNIT Surat',
    category: 'Departmental Society',
    logoUrl: '/clubs/ches.png',
  },
  {
    id: 'club-chrd',
    name: 'CHRD (Dancing, Singing, Arts, Photography)',
    shortName: 'CHRD',
    description: 'Center for Human Resource Development (Dancing, Singing, Arts, Photography)',
    category: 'Cultural & Arts',
    logoUrl: '/clubs/chrd.png',
  },
  {
    id: 'club-ecell',
    name: 'E-Cell',
    shortName: 'E-Cell',
    description: 'Entrepreneurship Cell SVNIT',
    category: 'Entrepreneurship & Innovation',
  },
  {
    id: 'club-phoenix',
    name: 'Phoenix Racing & Phoenix Aero',
    shortName: 'Phoenix',
    description: 'Formula Student & Aeromodelling Team SVNIT',
    category: 'Automotive & Aeronautics',
    logoUrl: '/clubs/phoenix.png',
  },
  {
    id: 'club-drishti',
    name: 'Drishti',
    shortName: 'Drishti',
    description: 'Technical Club of SVNIT',
    category: 'Technical Club',
    logoUrl: '/clubs/drishti.png',
  },
  {
    id: 'club-nexus',
    name: 'NEXUS',
    shortName: 'NEXUS',
    description: 'Tech Club Exclusive for AI & CSE Students',
    category: 'Tech Club (AI & CSE)',
    logoUrl: '/clubs/nexus.png',
  },
  {
    id: 'club-gdgc',
    name: 'GDGC',
    shortName: 'GDGC',
    description: 'Google Developer Groups on Campus SVNIT',
    category: 'Technical & Developers',
    logoUrl: '/clubs/gdgc.png',
  },
  {
    id: 'club-cev',
    name: 'CEV (Cutting Edge Visionaries)',
    shortName: 'CEV',
    description: 'Cutting Edge Visionaries SVNIT',
    category: 'Technical & Interdisciplinary',
    logoUrl: '/clubs/cev.png',
  },
  {
    id: 'club-ces',
    name: 'CES (Civil Engineering Society)',
    shortName: 'CES',
    description: 'Civil Engineering Society SVNIT',
    category: 'Departmental Society',
    logoUrl: '/clubs/ces.png',
  },
  {
    id: 'club-think-india',
    name: 'Think India',
    shortName: 'Think India',
    description: 'Think India SVNIT Chapter (National Forum for Students & Youth)',
    category: 'Social & Youth Forum',
    logoUrl: '/clubs/think_india.png',
  },
];

// 7. Standard Error Codes
export const ErrorCodes = {
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  EVENT_ALREADY_EXISTS: 'EVENT_ALREADY_EXISTS',
  INVALID_EVENT_TIME: 'INVALID_EVENT_TIME',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT_NOT_FOUND: 'CONFLICT_NOT_FOUND',
  EXPENSE_NOT_FOUND: 'EXPENSE_NOT_FOUND',
  INVALID_EXPENSE_AMOUNT: 'INVALID_EXPENSE_AMOUNT',
  BUDGET_NOT_FOUND: 'BUDGET_NOT_FOUND',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;
export type ErrorCodes = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// 7. Standard API Response Helpers
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export function apiSuccess<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function apiError(code: string, message: string, status = 400) {
  return Response.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}
