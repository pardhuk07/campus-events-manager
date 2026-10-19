import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Indian Rupees */
export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

/** Format a Date for display */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format a DateTime for display */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Calculate remaining budget */
export function calcRemainingBudget(
  budgetAmount: number,
  totalSpent: number
): number {
  return budgetAmount - totalSpent;
}

/** Calculate percentage spent */
export function calcBudgetPercentage(
  budgetAmount: number,
  totalSpent: number
): number {
  if (budgetAmount === 0) return 0;
  return Math.min(100, Math.round((totalSpent / budgetAmount) * 100));
}
