'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

interface SemesterMonth {
  year: number;
  month: number; // 0-indexed (7 = Aug, 8 = Sep, 9 = Oct, 10 = Nov, 11 = Dec)
  key: string;   // "2026-08", "2026-09", etc.
  shortLabel: string; // "Aug", "Sep", "Oct", "Nov", "Dec"
  fullLabel: string;  // "August 2026", "September 2026", etc.
}

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

  // Period mode: 'semester' | 'month'
  const [viewPeriod, setViewPeriod] = useState<'semester' | 'month'>('semester');

  // Month selector state (defaults to current month: e.g. "2026-10")
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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
        fetch(
          isMember
            ? `/api/events?userRole=${UserRole.MEMBER}`
            : `/api/events?userRole=${encodeURIComponent(currentRole)}`
        ),
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
    startDate: '2026-08-01',
    endDate: '2026-12-31',
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

  // Generate semester months dynamically (Aug 2026 to Dec 2026)
  const semesterMonths: SemesterMonth[] = useMemo(() => {
    const list: SemesterMonth[] = [
      { year: 2026, month: 7, key: '2026-08', shortLabel: 'Aug', fullLabel: 'August 2026' },
      { year: 2026, month: 8, key: '2026-09', shortLabel: 'Sep', fullLabel: 'September 2026' },
      { year: 2026, month: 9, key: '2026-10', shortLabel: 'Oct', fullLabel: 'October 2026' },
      { year: 2026, month: 10, key: '2026-11', shortLabel: 'Nov', fullLabel: 'November 2026' },
      { year: 2026, month: 11, key: '2026-12', shortLabel: 'Dec', fullLabel: 'December 2026' },
    ];

    // Check if any expenses fall outside default months and include them
    for (const ex of expenses) {
      if (ex.expenseDate) {
        const d = new Date(ex.expenseDate);
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        if (!list.some((item) => item.key === key)) {
          const shortLabel = d.toLocaleString('en-US', { month: 'short' });
          const fullLabel = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
          list.push({ year: y, month: m, key, shortLabel, fullLabel });
        }
      }
    }

    return list.sort((a, b) => a.key.localeCompare(b.key));
  }, [expenses]);

  // Compute monthly spending for each month in the semester
  const monthlySpendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of semesterMonths) {
      map[m.key] = 0;
    }
    for (const ex of expenses) {
      if (ex.expenseDate) {
        const d = new Date(ex.expenseDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const amt = parseFloat(ex.amount) || 0;
        if (map[key] !== undefined) {
          map[key] += amt;
        } else {
          map[key] = amt;
        }
      }
    }
    return map;
  }, [expenses, semesterMonths]);

  const maxMonthlySpend = useMemo(() => {
    const values = Object.values(monthlySpendingMap);
    return Math.max(1, ...values);
  }, [monthlySpendingMap]);

  // Selected Month details
  const selectedMonthObj = useMemo(() => {
    return (
      semesterMonths.find((m) => m.key === selectedMonthKey) ||
      semesterMonths[2] || // fallback to Oct 2026
      { year: 2026, month: 9, key: '2026-10', shortLabel: 'Oct', fullLabel: 'October 2026' }
    );
  }, [semesterMonths, selectedMonthKey]);

  const selectedMonthIndex = semesterMonths.findIndex((m) => m.key === selectedMonthKey);

  const handlePrevMonth = () => {
    if (selectedMonthIndex > 0) {
      setSelectedMonthKey(semesterMonths[selectedMonthIndex - 1].key);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex < semesterMonths.length - 1) {
      setSelectedMonthKey(semesterMonths[selectedMonthIndex + 1].key);
    }
  };

  // Base Semester Budget
  const budget = parseFloat(activeBudget.amount) || 50000;

  // Filter expenses and calculate based on active mode (Semester vs Month)
  const isMonthMode = viewPeriod === 'month';

  // 1. Month Mode Expenses: Only expenses dated in the selected month
  const monthFilteredExpenses = useMemo(() => {
    const [y, mStr] = selectedMonthKey.split('-').map(Number);
    const mIndex = mStr - 1;
    return expenses.filter((ex) => {
      const d = new Date(ex.expenseDate);
      return d.getFullYear() === y && d.getMonth() === mIndex;
    });
  }, [expenses, selectedMonthKey]);

  // Cumulative spending through the end of the selected month
  const cumulativeSpendingThroughSelectedMonth = useMemo(() => {
    const [y, mStr] = selectedMonthKey.split('-').map(Number);
    const mIndex = mStr - 1;
    // End of the selected month at 23:59:59.999
    const endOfMonthTimestamp = new Date(y, mIndex + 1, 0, 23, 59, 59, 999).getTime();

    return expenses
      .filter((ex) => new Date(ex.expenseDate).getTime() <= endOfMonthTimestamp)
      .reduce((sum, ex) => sum + (parseFloat(ex.amount) || 0), 0);
  }, [expenses, selectedMonthKey]);

  // Overall semester total spent
  const semesterTotalSpent = useMemo(() => {
    return expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  }, [expenses]);

  // Total spent in active view
  const activeTotalSpent = isMonthMode
    ? monthFilteredExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    : semesterTotalSpent;

  // Remaining Balance:
  // "Remaining Balance should always be the semester budget minus spending up to the end of the selected month, and the label should say which it is."
  const activeRemainingBalance = isMonthMode
    ? budget - cumulativeSpendingThroughSelectedMonth
    : budget - semesterTotalSpent;

  const percent = budget > 0 ? Math.min(100, Math.round((activeTotalSpent / budget) * 100)) : 0;

  // Active expenses for ledger and category breakdown
  const displayedExpenses = isMonthMode ? monthFilteredExpenses : expenses;

  // Category breakdown for charts
  const categoryBreakdown: Record<string, number> = useMemo(() => {
    const breakdown: Record<string, number> = {};
    for (const cat of Object.values(ExpenseCategory)) {
      breakdown[cat] = 0;
    }
    for (const ex of displayedExpenses) {
      if (breakdown[ex.category] !== undefined) {
        breakdown[ex.category] += parseFloat(ex.amount) || 0;
      }
    }
    return breakdown;
  }, [displayedExpenses]);

  // Sorted ledger expenses (newest first)
  const sortedExpenses = useMemo(() => {
    return [...displayedExpenses].sort(
      (a, b) =>
        new Date(b.createdAt || b.expenseDate).getTime() -
        new Date(a.createdAt || a.expenseDate).getTime()
    );
  }, [displayedExpenses]);

  // Red Warning if Semester Total Spent exceeds ₹50,000
  const isBudgetExceeded = semesterTotalSpent > 50000;
  const excessBudgetAmount = semesterTotalSpent - 50000;

  // Approved events for expense linking
  const approvedEvents = events.filter((ev: any) => ev.status === 'APPROVED');

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
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

      {/* 1. TOP CONTROL BAR: 'Semester | Month' Toggle & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Toggle: Semester | Month */}
          <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setViewPeriod('semester')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewPeriod === 'semester'
                  ? 'tab-active-gradient font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <span>🎓</span>
              <span>Semester</span>
            </button>
            <button
              type="button"
              onClick={() => setViewPeriod('month')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewPeriod === 'month'
                  ? 'tab-active-gradient font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <span>📅</span>
              <span>Month</span>
            </button>
          </div>

          {/* Month Selector: Appears in Month mode with dropdown + prev/next arrows */}
          {isMonthMode && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={selectedMonthIndex <= 0}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent font-bold text-sm transition cursor-pointer"
                title="Previous Month"
              >
                ‹
              </button>

              <select
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 py-1 px-2 border-0 focus:outline-none cursor-pointer"
              >
                {semesterMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.fullLabel}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextMonth}
                disabled={selectedMonthIndex >= semesterMonths.length - 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent font-bold text-sm transition cursor-pointer"
                title="Next Month"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* Informative Context Pill */}
        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
          {isMonthMode ? (
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-xl font-semibold text-xs">
              <span>Filtering month:</span>
              <strong className="underline">{selectedMonthObj.fullLabel}</strong>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1 rounded-xl font-medium text-xs">
              <span>Full Period:</span>
              <strong className="text-slate-900">{activeBudget.name || 'Fall 2026 Semester'}</strong>
            </div>
          )}
        </div>
      </div>

      {/* 2. SMALL 'MONTHLY SPENDING' BAR CHART (Clickable bars select month) */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-slate-900 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Monthly Spending
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Click any month bar to filter analytics for that month
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-4 items-end pt-3 pb-1">
          {semesterMonths.map((m) => {
            const isSelected = isMonthMode && selectedMonthKey === m.key;
            const spend = monthlySpendingMap[m.key] || 0;
            const heightPercent =
              maxMonthlySpend > 0 ? Math.max(12, Math.round((spend / maxMonthlySpend) * 100)) : 12;

            return (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  setViewPeriod('month');
                  setSelectedMonthKey(m.key);
                }}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition group text-center cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/80 border-2 border-indigo-600 shadow-sm'
                    : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                }`}
                title={`Click to inspect ${m.fullLabel}: ₹${spend.toLocaleString('en-IN')}`}
              >
                {/* Spending Amount */}
                <span
                  className={`text-[11px] font-black tracking-tight ${
                    isSelected ? 'text-indigo-700 font-extrabold' : 'text-slate-700'
                  }`}
                >
                  ₹{spend.toLocaleString('en-IN')}
                </span>

                {/* Bar Track & Fill */}
                <div className="w-full bg-slate-100 rounded-lg h-16 flex items-end p-1 border border-slate-200">
                  <div
                    className={`w-full rounded-md transition-all duration-300 ${
                      isSelected
                        ? 'btn-primary-gradient shadow-xs'
                        : spend > 0
                        ? 'bg-indigo-400 group-hover:bg-indigo-500'
                        : 'bg-slate-200'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  ></div>
                </div>

                {/* Month Name */}
                <span
                  className={`text-xs font-bold ${
                    isSelected
                      ? 'text-indigo-900 font-extrabold'
                      : 'text-slate-500 group-hover:text-slate-800'
                  }`}
                >
                  {m.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. SUMMARY CARDS (Total Budget, Total Spent, Remaining Balance) */}
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
                  className="text-[11px] bg-violet-50 hover:bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-lg border border-violet-200 transition font-bold cursor-pointer"
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
                  className="btn-primary-gradient text-white text-xs px-3 py-2 rounded-xl font-bold transition shadow-sm cursor-pointer"
                >
                  {savingBudget ? '...' : 'Save'}
                </button>
              </div>
              <p className="text-[10px] text-amber-700 font-medium">Authorized: CORE_VERIFIER override privilege</p>
            </form>
          ) : (
            <>
              <div className="text-3xl font-black mt-2 text-slate-900">₹{budget.toLocaleString('en-IN')}</div>
              <p className="text-xs text-slate-500 mt-1 font-medium">{activeBudget.name || 'Semester Budget'}</p>
            </>
          )}
        </div>

        {/* Total Spent Card (Recalculated in Month Mode) */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-900">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">
              {isMonthMode ? `Total Spent (${selectedMonthObj.fullLabel})` : 'Total Semester Spent'}
            </span>
            <TrendingUpIcon className="w-4 h-4 text-cyan-600" />
          </div>
          <div
            className={`text-3xl font-black mt-2 ${
              isBudgetExceeded ? 'text-rose-600' : 'text-cyan-700'
            }`}
          >
            ₹{activeTotalSpent.toLocaleString('en-IN')}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden border border-slate-200">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isBudgetExceeded
                  ? 'bg-rose-500'
                  : percent > 80
                  ? 'bg-amber-500'
                  : 'btn-primary-gradient'
              }`}
              style={{ width: `${Math.min(100, percent)}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            {isMonthMode
              ? `${percent}% of total semester budget disbursed in ${selectedMonthObj.shortLabel}`
              : `${percent}% of total semester budget utilized`}
          </p>
        </div>

        {/* Remaining Budget Card:
            "Remaining Balance should always be the semester budget minus spending up to the end of the selected month, and the label should say which it is." */}
        <div
          className={`border p-6 rounded-2xl shadow-sm text-slate-900 ${
            activeRemainingBalance < 0
              ? 'bg-rose-50/60 border-rose-300'
              : activeRemainingBalance < 10000
              ? 'bg-amber-50/60 border-amber-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">
              {isMonthMode
                ? `Remaining Balance (Through ${selectedMonthObj.shortLabel} ${selectedMonthObj.year})`
                : 'Remaining Balance (Full Semester)'}
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeRemainingBalance < 0
                  ? 'bg-rose-500'
                  : activeRemainingBalance < 10000
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            ></span>
          </div>
          <div
            className={`text-3xl font-black mt-2 ${
              activeRemainingBalance < 0
                ? 'text-rose-600'
                : activeRemainingBalance < 10000
                ? 'text-amber-800'
                : 'text-emerald-600'
            }`}
          >
            {activeRemainingBalance < 0
              ? `-₹${Math.abs(activeRemainingBalance).toLocaleString('en-IN')}`
              : `₹${activeRemainingBalance.toLocaleString('en-IN')}`}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {isMonthMode
              ? `Semester budget minus ₹${cumulativeSpendingThroughSelectedMonth.toLocaleString('en-IN')} cumulative spending through end of ${selectedMonthObj.fullLabel}`
              : activeRemainingBalance < 0
              ? 'Semester budget ceiling exceeded'
              : 'Available for upcoming approved club proposals'}
          </p>
        </div>
      </div>

      {/* 4. VISUAL CHARTS (Donut Chart & Category Breakdown Bars - Recalculated for Mode) */}
      <BudgetCharts
        totalBudget={budget}
        totalSpent={activeTotalSpent}
        remainingBudget={activeRemainingBalance}
        percentSpent={percent}
        categoryBreakdown={categoryBreakdown}
        periodLabel={isMonthMode ? selectedMonthObj.fullLabel : 'Full Semester'}
      />

      {/* 5. INSTITUTIONAL LEDGER TABLE */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <ReceiptIcon className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Institutional Ledger {isMonthMode ? `• ${selectedMonthObj.fullLabel}` : '• All Semester'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isMonthMode
                ? `Disbursements recorded specifically in ${selectedMonthObj.fullLabel}`
                : 'Historical reimbursements, event cost records & digital audit trail'}
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

        {/* Friendly Empty State for Months with No Expenses */}
        {sortedExpenses.length === 0 ? (
          isMonthMode ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
                🍃
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                No Expenses in {selectedMonthObj.fullLabel}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No campus club reimbursements or expenditures were recorded for this month. All budget allocations remain intact!
              </p>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs italic">
              No expenses logged yet this period.
            </div>
          )
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
                  const catInfo = CATEGORY_COLORS[item.category] || {
                    label: item.category,
                    hex: '#6366f1',
                  };
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
          <span className="font-semibold text-slate-600">
            Total items: {sortedExpenses.length} {isMonthMode ? `(${selectedMonthObj.shortLabel})` : '(Semester)'}
          </span>
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
        currentTotalSpent={semesterTotalSpent}
      />
    </div>
  );
}
