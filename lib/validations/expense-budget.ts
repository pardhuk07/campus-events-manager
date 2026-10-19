import { z } from "zod";

export const ExpenseCategoryEnum = z.enum([
  "FOOD",
  "VENUE",
  "PRIZES",
  "MARKETING",
  "PRINTING",
  "EQUIPMENT",
  "TRAVEL",
  "MISCELLANEOUS",
]);

export const BudgetPeriodEnum = z.enum(["MONTHLY", "SEMESTER"]);

export const CreateExpenseSchema = z.object({
  eventId: z.string().uuid("Invalid event ID format").optional().nullable(),
  amount: z.number().positive("Amount must be greater than 0"),
  category: ExpenseCategoryEnum,
  description: z.string().optional().nullable(),
  expenseDate: z.string().datetime().or(z.date()),
  receiptUrl: z.string().url("Must be a valid URL").optional().nullable(),
  receiptPublicId: z.string().optional().nullable(),
  submittedById: z.string().min(1, "Submitted by ID is required"),
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial();

export const CreateBudgetSchema = z
  .object({
    name: z.string().min(1, "Budget name is required"),
    amount: z.number().min(0, "Amount must be at least 0"),
    periodType: BudgetPeriodEnum,
    startDate: z.string().datetime().or(z.date()),
    endDate: z.string().datetime().or(z.date()),
  })
  .refine(
    (data) => new Date(data.startDate) < new Date(data.endDate),
    {
      message: "startDate must be before endDate",
      path: ["endDate"],
    }
  );

export const UpdateBudgetSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  periodType: BudgetPeriodEnum.optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
});
