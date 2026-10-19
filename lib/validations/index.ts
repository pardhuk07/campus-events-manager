import { z } from "zod";

// ─── Event Validation ──────────────────────────────────────────────────────

export const eventBaseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().optional(),
  clubId: z.string().min(1, "Club is required"),
  startTime: z.string().datetime("Invalid start time"),
  endTime: z.string().datetime("Invalid end time"),
  venue: z.string().min(1, "Venue is required"),
  audienceTags: z.array(z.string()).min(1, "At least one audience tag required"),
  expectedAttendance: z.number().int().positive().optional(),
  category: z.string().optional(),
});

export const createEventSchema = eventBaseSchema.refine(
  (data) => new Date(data.endTime) > new Date(data.startTime),
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
);

export const updateEventSchema = eventBaseSchema.partial();

// ─── Expense Validation ─────────────────────────────────────────────────────

export const createExpenseSchema = z.object({
  eventId: z.string().optional(),
  amount: z.number().positive("Amount must be greater than 0"),
  category: z.enum([
    "FOOD",
    "VENUE",
    "PRIZES",
    "MARKETING",
    "PRINTING",
    "EQUIPMENT",
    "TRAVEL",
    "MISCELLANEOUS",
  ]),
  description: z.string().optional(),
  expenseDate: z.string().datetime("Invalid expense date"),
  receiptUrl: z.string().url().optional(),
  receiptPublicId: z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

// ─── Budget Validation ──────────────────────────────────────────────────────

export const createBudgetSchema = z
  .object({
    name: z.string().min(1, "Budget name is required"),
    amount: z.number().nonnegative("Budget amount must be 0 or more"),
    periodType: z.enum(["MONTHLY", "SEMESTER"]),
    startDate: z.string().datetime("Invalid start date"),
    endDate: z.string().datetime("Invalid end date"),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

// ─── Conflict Validation ────────────────────────────────────────────────────

export const updateConflictSchema = z.object({
  status: z.enum(["FLAGGED", "REVIEWED", "DISMISSED", "RESOLVED"]),
  resolutionNote: z.string().optional(),
});
