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

// 6. Standard Error Codes
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
