'use client';

import React, { useState, useEffect } from 'react';
import BudgetCharts from './BudgetCharts';
import AddExpenseModal from './AddExpenseModal';
import {
  RupeeIcon,
  TrendingUpIcon,
  PlusCircleIcon,
  ReceiptIcon,
  DownloadIcon,
  AlertTriangleIcon,
} from './Icons';
import { CATEGORY_COLORS } from '@/lib/colors';
import { UserRole, ExpenseCategory } from '@/lib/constants';

export default function ExpenseManager({
  currentRole,
  currentUser,
}: {
  currentRole: string;
  currentUser?: any;
}) {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  // Budget Edit State (STRICTLY for CORE_VERIFIER)
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState('50000');
  const [savingBudget, setSavingBudget] = useState(false);

  // Add Expense Modal State
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const isCoreVerifier = currentRole === UserRole.CORE_VERIFIER || currentRole === 'ACM_CORE';
  const isMember = currentRole === UserRole.MEMBER;
  const canAddExpense = currentRole === UserRole.CLUB_EXEC || isCoreVerifier;

  const fetchBudgetData = async () => {
    try {
      const [budgetsRes, expensesRes, eventsRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/expenses'),
        fetch(isMember ? `/api/events?userRole=${UserRole.MEMBER}` : `/api/events?userRole=${encodeURIComponent(currentRole)}`),
      ]);

      const budgetsJson = await budgetsRes.json();
      const expensesJson = await expensesRes.json();
      const eventsJson = await eventsRes.json();

      if (budgetsJson.success && budgetsJson.data) {
        setBudgets(budgetsJson.data);
        if (budgetsJson.data.length > 0) {
          setNewBudgetAmount(String(budgetsJson.data[0].amount));
        }
      }
      if (expensesJson.success && expensesJson.data) {
        setExpenses(expensesJson.data);
      }
      if (eventsJson.success && eventsJson.data) {
        setEvents(eventsJson.data);
      }
    } catch (err) {
      console.error('Failed to load expenses/budget data:', err);
    }
  };

  useEffect(() => {
    fetchBudgetData();
  }, [currentRole]);

  const activeBudget = budgets[0] || {
    id: 'budget-fall-2026',
    name: 'Fall 2026 Semester Budget',
    amount: 50000,
    totalSpent: 0,
    remainingBudget: 50000,
    percentSpent: 0,
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudgetAmount || !isCoreVerifier) return;

    setSavingBudget(true);
    try {
      const res = await fetch(`/api/budgets/${activeBudget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(newBudgetAmount),
          userRole: UserRole.CORE_VERIFIER,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setIsEditingBudget(false);
        fetchBudgetData();
      } else {
        alert(result.error?.message || result.error || 'Failed to update budget');
      }
    } catch (err) {
      console.error('Error updating budget:', err);
    } finally {
      setSavingBudget(false);
    }
  };

  const handleDownloadReport = () => {
    window.open('/api/reports/handover?format=csv', '_blank');
  };

  // Compute category breakdown reactively from expenses array
  const categoryBreakdown: Record<string, number> = {};
  for (const cat of Object.values(ExpenseCategory)) {
    categoryBreakdown[cat] = 0;
  }
  for (const ex of expenses) {
    if (categoryBreakdown[ex.category] !== undefined) {
      categoryBreakdown[ex.category] += parseFloat(ex.amount);
    }
  }

  // Reactive calculations ensuring totals, charts, and balance update without refresh
  const budget = parseFloat(activeBudget.amount) || 50000;
  const spent = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const remaining = budget - spent;
  const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  // Red Warning if Total Spent exceeds ₹50,000
  const isBudgetExceeded = spent > 50000;
  const excessBudgetAmount = spent - 50000;

  // Approved events for expense linking
  const approvedEvents = events.filter((ev: any) => ev.status === 'APPROVED');

  // Expenses sorted newest first
  const sortedExpenses = [...expenses].sort(
    (a, b) =>
      new Date(b.createdAt || b.expenseDate).getTime() -
      new Date(a.createdAt || a.expenseDate).getTime()
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Red Warning Banner if Semester Budget Exceeded */}
      {isBudgetExceeded && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-700 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangleIcon className="w-5 h-5 text-rose-600 shrink-0" />
            <span>This exceeds the semester budget by ₹{excessBudgetAmount.toLocaleString('en-IN')}</span>
          </div>
          <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded bg-rose-200 text-rose-900">
            Over Budget
          </span>
        </div>
      )}

      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Budget Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-900 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Total Semester Budget</span>
            <div className="flex items-center gap-2">
              <RupeeIcon className="w-4 h-4 text-indigo-600" />
              {isCoreVerifier && (
                <button
                  type="button"
                  onClick={() => setIsEditingBudget(!isEditingBudget)}
                  className="text-[11px] bg-violet-50 hover:bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-lg border border-violet-200 transition font-bold"
                >
                  {isEditingBudget ? 'Cancel' : 'Edit Budget'}
                </button>
              )}
            </div>
          </div>

          {isEditingBudget && isCoreVerifier ? (
            <form onSubmit={handleUpdateBudget} className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="100"
                  required
                  value={newBudgetAmount}
                  onChange={(e) => setNewBudgetAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 font-bold"
                />
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="btn-primary-gradient text-white text-xs px-3 py-2 rounded-xl font-bold transition shadow-sm"
                >
                  {savingBudget ? '...' : 'Save'}
                </button>
              </div>
              <p className="text-[10px] text-amber-700 font-medium">Authorized: CORE_VERIFIER override privilege</p>
            </form>
          ) : (
            <>
              <div className="text-3xl font-black mt-2 text-slate-900">₹{budget.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1 font-medium">{activeBudget.name || 'Semester Budget'}</p>
            </>
          )}
        </div>

        {/* Total Spent Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-900">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Total Spent</span>
            <TrendingUpIcon className="w-4 h-4 text-cyan-600" />
          </div>
          <div className={`text-3xl font-black mt-2 ${isBudgetExceeded ? 'text-rose-600' : 'text-cyan-700'}`}>
            ₹{spent.toLocaleString()}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden border border-slate-200">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${isBudgetExceeded ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'btn-primary-gradient'}`}
              style={{ width: `${Math.min(100, percent)}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">{percent}% of budget utilized</p>
        </div>

        {/* Remaining Budget Card */}
        <div
          className={`border p-6 rounded-2xl shadow-sm text-slate-900 ${
            remaining < 0
              ? 'bg-rose-50/60 border-rose-300'
              : remaining < 10000
              ? 'bg-amber-50/60 border-amber-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Remaining Balance</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                remaining < 0 ? 'bg-rose-500' : remaining < 10000 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            ></span>
          </div>
          <div
            className={`text-3xl font-black mt-2 ${
              remaining < 0 ? 'text-rose-600' : remaining < 10000 ? 'text-amber-800' : 'text-emerald-600'
            }`}
          >
            {remaining < 0 ? `-₹${Math.abs(remaining).toLocaleString()}` : `₹${remaining.toLocaleString()}`}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {remaining < 0 ? 'Semester budget ceiling exceeded' : 'Available for upcoming approved club proposals'}
          </p>
        </div>
      </div>

      {/* 2. Visual Charts (Donut & Category Breakdown Bars) */}
      <BudgetCharts
        totalBudget={budget}
        totalSpent={spent}
        remainingBudget={remaining}
        percentSpent={percent}
        categoryBreakdown={categoryBreakdown}
      />

      {/* 3. Institutional Ledger Table (Date, Event, Category, Description, Amount, Added By) */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ReceiptIcon className="w-5 h-5 text-indigo-600" />
              Institutional Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Historical reimbursements, event cost records & digital audit trail
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Add Expense Button - Visible to Club Executive and ACM Core roles only */}
            {canAddExpense && (
              <button
                type="button"
                onClick={() => setIsAddExpenseOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 btn-primary-gradient text-white text-xs font-bold rounded-xl shadow-md transition hover:opacity-95 cursor-pointer"
              >
                <PlusCircleIcon className="w-4 h-4" />
                <span>+ Add Expense</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadReport}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition shadow-xs cursor-pointer"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export Handover CSV</span>
            </button>
          </div>
        </div>

        {sortedExpenses.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            No expenses logged yet this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-bold">Date</th>
                  <th className="pb-3 font-bold">Event</th>
                  <th className="pb-3 font-bold">Category</th>
                  <th className="pb-3 font-bold">Description</th>
                  <th className="pb-3 font-bold text-center">Receipt</th>
                  <th className="pb-3 font-bold text-right">Amount</th>
                  <th className="pb-3 font-bold pl-4">Added by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedExpenses.map((item: any) => {
                  const catInfo = CATEGORY_COLORS[item.category] || { label: item.category, hex: '#6366f1' };
                  const eventTitle = item.event?.title || 'General Campus Event';
                  const addedByName = item.addedByName || item.submittedBy?.name || 'Club Executive';
                  const addedAt = item.createdAt || item.expenseDate;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      {/* 1. Date */}
                      <td className="py-3 font-medium text-slate-700 whitespace-nowrap">
                        {new Date(item.expenseDate).toLocaleDateString([], { dateStyle: 'medium' })}
                      </td>

                      {/* 2. Event */}
                      <td className="py-3 text-slate-800 font-semibold max-w-[180px] truncate" title={eventTitle}>
                        {eventTitle}
                      </td>

                      {/* 3. Category */}
                      <td className="py-3">
                        <span
                          className="text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                          style={{ backgroundColor: `${catInfo.hex}18`, color: catInfo.hex }}
                        >
                          {catInfo.label}
                        </span>
                      </td>

                      {/* 4. Description */}
                      <td className="py-3 text-slate-600 max-w-[240px] text-xs">
                        <p className="line-clamp-2" title={item.description || ''}>
                          {item.description || '—'}
                        </p>
                      </td>

                      {/* 5. Receipt (View link in new tab or dash) */}
                      <td className="py-3 text-center whitespace-nowrap">
                        {item.receiptUrl ? (
                          <a
                            href={item.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 shadow-2xs"
                            title={item.receiptFileName || 'View uploaded receipt in new tab'}
                          >
                            <ReceiptIcon className="w-3.5 h-3.5 text-indigo-600" />
                            <span>View</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>

                      {/* 6. Amount */}
                      <td className="py-3 text-right font-black text-slate-900 whitespace-nowrap">
                        ₹{parseFloat(item.amount).toLocaleString('en-IN')}
                      </td>

                      {/* 7. Added by with timestamp */}
                      <td className="py-3 pl-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-xs">{addedByName}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(addedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Fund Ledger audited under ACM Core Financial Policy</span>
          <span className="font-semibold text-slate-600">Total items: {sortedExpenses.length}</span>
        </div>
      </div>

      {/* Add Expense Modal (Visible to Club Executive & ACM Core) */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSuccess={() => {
          fetchBudgetData();
        }}
        currentRole={currentRole}
        currentUser={currentUser}
        approvedEvents={approvedEvents}
        currentTotalSpent={spent}
      />
    </div>
  );
}
