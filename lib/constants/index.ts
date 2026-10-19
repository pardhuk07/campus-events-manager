// ─────────────────────────────────────────────────────────
// SHARED CONSTANTS — DO NOT CHANGE WITHOUT TEAM DISCUSSION
// ─────────────────────────────────────────────────────────

export const USER_ROLES = {
  MEMBER: "MEMBER",
  CLUB_EXEC: "CLUB_EXEC",
  CORE_VERIFIER: "CORE_VERIFIER",
} as const;

export const EVENT_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
} as const;

export const CONFLICT_STATUS = {
  FLAGGED: "FLAGGED",
  REVIEWED: "REVIEWED",
  DISMISSED: "DISMISSED",
  RESOLVED: "RESOLVED",
} as const;

export const EXPENSE_CATEGORIES = [
  "FOOD",
  "VENUE",
  "PRIZES",
  "MARKETING",
  "PRINTING",
  "EQUIPMENT",
  "TRAVEL",
  "MISCELLANEOUS",
] as const;

export const BUDGET_PERIODS = ["MONTHLY", "SEMESTER"] as const;

// Default semester budget in INR
export const DEFAULT_SEMESTER_BUDGET = 50000;

// Audience tag options for event forms
export const AUDIENCE_TAGS = [
  { value: "ALL_STUDENTS", label: "All Students" },
  { value: "CS_DEPT", label: "CS Department" },
  { value: "IT_DEPT", label: "IT Department" },
  { value: "EC_DEPT", label: "EC Department" },
  { value: "ME_DEPT", label: "ME Department" },
  { value: "CE_DEPT", label: "CE Department" },
  { value: "FIRST_YEAR", label: "First Year" },
  { value: "SECOND_YEAR", label: "Second Year" },
  { value: "THIRD_YEAR", label: "Third Year" },
  { value: "FOURTH_YEAR", label: "Fourth Year" },
  { value: "POSTGRADUATE", label: "Postgraduate" },
] as const;

// Event category options
export const EVENT_CATEGORIES = [
  "WORKSHOP",
  "SEMINAR",
  "HACKATHON",
  "COMPETITION",
  "GUEST_LECTURE",
  "SOCIAL",
  "MEETING",
  "OTHER",
] as const;

// Error codes — use these in errorResponse()
export const ERROR_CODES = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  // Events
  EVENT_NOT_FOUND: "EVENT_NOT_FOUND",
  EVENT_ALREADY_EXISTS: "EVENT_ALREADY_EXISTS",
  INVALID_EVENT_TIME: "INVALID_EVENT_TIME",
  // Conflicts
  CONFLICT_NOT_FOUND: "CONFLICT_NOT_FOUND",
  // Expenses
  EXPENSE_NOT_FOUND: "EXPENSE_NOT_FOUND",
  INVALID_EXPENSE_AMOUNT: "INVALID_EXPENSE_AMOUNT",
  // Budgets
  BUDGET_NOT_FOUND: "BUDGET_NOT_FOUND",
  // Files
  FILE_UPLOAD_FAILED: "FILE_UPLOAD_FAILED",
  // General
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
