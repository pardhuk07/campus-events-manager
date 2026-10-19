"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, DollarSign, Calendar, AlertCircle } from "lucide-react";

interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  periodType: "MONTHLY" | "SEMESTER";
  startDate: string;
  endDate: string;
  totalSpent: number;
  remainingBudget: number;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    amount: "",
    periodType: "MONTHLY",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  async function fetchBudgets() {
    try {
      setLoading(true);
      const res = await fetch("/api/budgets");
      const result = await res.json();
      if (result.success) {
        setBudgets(result.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBudget(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          amount: parseFloat(form.amount),
          periodType: form.periodType,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
        }),
      });

      const result = await res.json();
      if (result.success) {
        setShowCreateModal(false);
        setForm({
          name: "",
          amount: "",
          periodType: "MONTHLY",
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        });
        fetchBudgets();
      } else {
        alert(result.error?.message || "Failed to create budget");
      }
    } catch (err: any) {
      alert(err.message || "Budget creation error");
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <Link
            href="/expenses"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Expenses
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Budget Management</h1>
          <p className="text-sm text-slate-500">
            Allocate funds, monitor period spending, and check remaining balances.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> New Budget
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
          No budgets configured yet. Create a monthly or semester budget to start tracking.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const pctUsed = Math.min(
              100,
              Math.round((b.totalSpent / (b.amount || 1)) * 100)
            );
            const isOverBudget = b.remainingBudget < 0;

            return (
              <div
                key={b.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 mb-1">
                      {b.periodType}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">{b.name}</h2>
                    <p className="text-xs text-slate-400">
                      {new Date(b.startDate).toLocaleDateString()} —{" "}
                      {new Date(b.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Budget</span>
                    <span className="text-lg font-bold text-slate-900">
                      ₹{b.amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">Spent: ₹{b.totalSpent.toFixed(2)} ({pctUsed}%)</span>
                    <span className={isOverBudget ? "text-red-600" : "text-emerald-600"}>
                      Remaining: ₹{b.remainingBudget.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isOverBudget
                          ? "bg-red-500"
                          : pctUsed > 80
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${pctUsed}%` }}
                    />
                  </div>
                </div>

                {isOverBudget && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs font-medium text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    Budget threshold exceeded by ₹{Math.abs(b.remainingBudget).toFixed(2)}!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create New Budget</h3>
            <form onSubmit={handleCreateBudget} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Budget Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Spring 2026 Tech Fest"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Amount (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="25000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Period
                  </label>
                  <select
                    value={form.periodType}
                    onChange={(e: any) =>
                      setForm({ ...form, periodType: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="SEMESTER">SEMESTER</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow hover:bg-emerald-700"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
