"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Receipt, Filter, DollarSign, Calendar } from "lucide-react";

interface ExpenseItem {
  id: string;
  amount: number | string;
  category: string;
  description: string | null;
  expenseDate: string;
  receiptUrl: string | null;
  event?: {
    id: string;
    title: string;
  } | null;
  submittedBy?: {
    name: string;
    email: string;
  } | null;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = [
    "ALL",
    "FOOD",
    "VENUE",
    "PRIZES",
    "MARKETING",
    "PRINTING",
    "EQUIPMENT",
    "TRAVEL",
    "MISCELLANEOUS",
  ];

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter]);

  async function fetchExpenses() {
    try {
      setLoading(true);
      const url =
        categoryFilter && categoryFilter !== "ALL"
          ? `/api/expenses?category=${categoryFilter}`
          : "/api/expenses";
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setExpenses(result.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const totalSpent = expenses.reduce(
    (acc, item) => acc + Number(item.amount || 0),
    0
  );

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Expenses Management
          </h1>
          <p className="text-sm text-slate-500">
            Track, link events, review receipts, and record campus spending.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/budgets"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <DollarSign className="h-4 w-4" /> View Budgets
          </Link>
          <Link
            href="/expenses/create"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">Total Filtered Spending</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹{totalSpent.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">Total Entries</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{expenses.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">Receipts Verified</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {expenses.filter((e) => e.receiptUrl).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat === "ALL" ? "" : cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              (cat === "ALL" && !categoryFilter) || categoryFilter === cat
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No expenses found. Click &quot;Add Expense&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Linked Event</th>
                  <th className="py-3 px-4 font-semibold">Receipt</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        {expense.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {expense.description || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {expense.event ? (
                        <span className="text-blue-600 hover:underline">
                          {expense.event.title}
                        </span>
                      ) : (
                        <span className="text-slate-400">General</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {expense.receiptUrl ? (
                        <a
                          href={expense.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <Receipt className="h-3.5 w-3.5" /> View
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      ₹{Number(expense.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/expenses/${expense.id}`}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
