'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AddExpenseModal from './AddExpenseModal';
import {
  RupeeIcon,
  PlusCircleIcon,
  AlertTriangleIcon,
  CalendarIcon,
  ReceiptIcon,
} from './Icons';
import { CATEGORY_COLORS } from '@/lib/colors';
import { UserRole } from '@/lib/constants';

interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface ClubSummary {
  clubId: string;
  clubName: string;
  allocated: number;
  committed: number;
  spent: number;
  remaining: number;
  availableToPlan: number;
  eventsCount: number;
  approvedEventsCount: number;
}

interface PerEventRow {
  id: string;
  title: string;
  status: string;
  startTime: string;
  endTime: string;
  venue: string;
  eventType: string;
  organizer: string;
  budget: number;
  spent: number;
  left: number;
  expenses: any[];
}

interface ClubDetailData {
  club: {
    id: string;
    name: string;
    description?: string;
  };
  semester: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  allocated: number;
  committed: number;
  spent: number;
  remaining: number;
  availableToPlan: number;
  perEventRows: PerEventRow[];
  monthlySpending: Array<{
    month: string;
    monthIndex: number;
    year: number;
    spent: number;
    expenseCount: number;
  }>;
  changeLogs: any[];
}

export default function ExpenseManager({
  currentRole,
  currentUser,
}: {
  currentRole: string;
  currentUser?: any;
}) {
  const isCore = currentRole === UserRole.CORE_VERIFIER || currentRole === 'ACM_CORE';
  const isExec = currentRole === UserRole.CLUB_EXEC;

  // Semesters list and selected semester
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  // Selected club for detail view (Core can switch; Exec locked to own club)
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  // Data states
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Overview data for Core
  const [allClubsData, setAllClubsData] = useState<{
    semester: any;
    totalAllocated: number;
    totalCommitted: number;
    totalSpent: number;
    totalRemaining: number;
    totalAvailableToPlan: number;
    clubs: ClubSummary[];
  } | null>(null);

  // Club detail data
  const [clubDetail, setClubDetail] = useState<ClubDetailData | null>(null);

  // All events (for Add Expense modal and global reference)
  const [allEvents, setAllEvents] = useState<any[]>([]);

  // Edit Budget Modal (Core only)
  const [editingClub, setEditingClub] = useState<{ id: string; name: string; currentAllocated: number } | null>(null);
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [budgetReason, setBudgetReason] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [editBudgetError, setEditBudgetError] = useState<string | null>(null);

  // Event Expenses Panel (opened upon clicking an event row)
  const [activeEventPanel, setActiveEventPanel] = useState<PerEventRow | null>(null);

  // Add Expense Modal
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Semester vs. Month view mode in Club Detail
  const [viewPeriod, setViewPeriod] = useState<'SEMESTER' | 'MONTH'>('SEMESTER');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const isExpenseInMonth = useCallback(
    (expDate: string | Date, monthStr: string) => {
      if (!expDate || !monthStr) return false;
      const d = new Date(expDate);
      if (isNaN(d.getTime())) return false;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      return label === monthStr;
    },
    []
  );

  // Sync selectedMonth with available months when clubDetail changes
  useEffect(() => {
    if (clubDetail?.monthlySpending && clubDetail.monthlySpending.length > 0) {
      const exists = clubDetail.monthlySpending.some((m) => m.month === selectedMonth);
      if (!exists) {
        const now = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const curLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
        const foundCurrent = clubDetail.monthlySpending.find((m) => m.month === curLabel);
        if (foundCurrent) {
          setSelectedMonth(foundCurrent.month);
        } else {
          setSelectedMonth(clubDetail.monthlySpending[0].month);
        }
      }
    }
  }, [clubDetail, selectedMonth]);

  // 1. Load Semesters on Mount
  useEffect(() => {
    async function loadSemesters() {
      try {
        const res = await fetch('/api/semesters');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSemesters(json.data);

          // Find semester containing today
          const now = new Date();
          const currentSem = json.data.find((s: Semester) => {
            const start = new Date(s.startDate);
            const end = new Date(s.endDate);
            return now >= start && now <= end;
          });

          // Default to the semester containing today, or first semester
          setSelectedSemesterId(currentSem ? currentSem.id : json.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load semesters:', err);
      }
    }
    loadSemesters();
  }, []);

  // 2. Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/events?userRole=${encodeURIComponent(currentRole)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAllEvents(json.data);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, [currentRole]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // 3. Fetch Budget Data based on active semester and role
  const fetchBudgetData = useCallback(async () => {
    if (!selectedSemesterId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // Executive always goes straight to their own club detail
      if (isExec) {
        if (!currentUser?.clubId) {
          setErrorMsg('Your executive account is not associated with an SVNIT club.');
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/club-budgets?semesterId=${encodeURIComponent(selectedSemesterId)}&clubId=${encodeURIComponent(currentUser.clubId)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setClubDetail(json.data);
          setSelectedClubId(currentUser.clubId);
        } else {
          setErrorMsg(json.error?.message || 'Failed to load club budget details.');
        }
      } else if (isCore) {
        // Core View
        if (selectedClubId) {
          // Fetch specific club detail
          const res = await fetch(`/api/club-budgets?semesterId=${encodeURIComponent(selectedSemesterId)}&clubId=${encodeURIComponent(selectedClubId)}`);
          const json = await res.json();
          if (json.success && json.data) {
            setClubDetail(json.data);
          } else {
            setErrorMsg(json.error?.message || 'Failed to load club budget details.');
          }
        } else {
          // Fetch overview of all clubs
          const res = await fetch(`/api/club-budgets?semesterId=${encodeURIComponent(selectedSemesterId)}`);
          const json = await res.json();
          if (json.success && json.data) {
            setAllClubsData(json.data);
            setClubDetail(null);
          } else {
            setErrorMsg(json.error?.message || 'Failed to load clubs overview.');
          }
        }
      }
    } catch (err: any) {
      console.error('Error loading budget data:', err);
      setErrorMsg(err.message || 'An unexpected error occurred loading budget information.');
    } finally {
      setLoading(false);
    }
  }, [selectedSemesterId, selectedClubId, isExec, isCore, currentUser]);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  // 4. Handle Edit Budget Submission (Core only)
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClub || !selectedSemesterId) return;

    setEditBudgetError(null);
    const parsedAmt = parseFloat(newBudgetAmount);
    if (isNaN(parsedAmt) || parsedAmt < 0) {
      setEditBudgetError('Please enter a valid non-negative allocation amount in rupees.');
      return;
    }

    if (!budgetReason.trim()) {
      setEditBudgetError('A reason is strictly required when setting or modifying a club budget.');
      return;
    }

    setSavingBudget(true);
    try {
      const res = await fetch('/api/club-budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': UserRole.CORE_VERIFIER,
        },
        body: JSON.stringify({
          clubId: editingClub.id,
          semesterId: selectedSemesterId,
          allocatedAmount: Math.round(parsedAmt),
          reason: budgetReason.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setEditingClub(null);
        setNewBudgetAmount('');
        setBudgetReason('');
        // Refresh all numbers without a page reload
        await fetchBudgetData();
        await fetchEvents();
      } else {
        setEditBudgetError(json.error?.message || 'Failed to save budget allocation.');
      }
    } catch (err: any) {
      setEditBudgetError(err.message || 'Network error updating budget.');
    } finally {
      setSavingBudget(false);
    }
  };

  // Helper function for progress bar color threshold:
  // green below 75%, amber from 75%, red from 90%
  const getProgressColor = (percent: number) => {
    if (percent < 75) {
      return {
        bg: 'bg-emerald-500',
        text: 'text-emerald-700',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    }
    if (percent < 90) {
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-700',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    }
    return {
      bg: 'bg-rose-500',
      text: 'text-rose-700',
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
    };
  };

  // Keep event expenses in sync when activeEventPanel is open
  const currentPanelEvent = useMemo(() => {
    if (!activeEventPanel || !clubDetail) return null;
    const found = clubDetail.perEventRows.find((r) => r.id === activeEventPanel.id) || activeEventPanel;
    if (viewPeriod === 'MONTH') {
      const filteredExpenses = (found.expenses || []).filter((ex: any) =>
        isExpenseInMonth(ex.expenseDate, selectedMonth)
      );
      const filteredSpent = filteredExpenses.reduce(
        (sum: number, ex: any) => sum + Math.round(Number(ex.amount || 0)),
        0
      );
      return {
        ...found,
        spent: filteredSpent,
        left: found.budget - filteredSpent,
        expenses: filteredExpenses,
      };
    }
    return found;
  }, [activeEventPanel, clubDetail, viewPeriod, selectedMonth, isExpenseInMonth]);

  return (
    <div className="space-y-6">
      {/* Top Header & Semester Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
              <RupeeIcon className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {isExec
                  ? `${clubDetail?.club?.name || 'Club'} Semester Budget`
                  : selectedClubId
                  ? `${clubDetail?.club?.name || 'Club'} Budget Details`
                  : 'Campus Club Budgets & Fund Allocations'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {isExec
                  ? 'Official fixed semester allocation and verified event expense ledger'
                  : selectedClubId
                  ? 'Deep-dive event audit and expense tracking'
                  : 'Centralized semester fund monitoring for all SVNIT campus clubs'}
              </p>
            </div>
          </div>
        </div>

        {/* Semester Selector Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 shadow-2xs">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            <select
              value={selectedSemesterId}
              onChange={(e) => {
                setSelectedSemesterId(e.target.value);
                // Keep selectedClubId if drilled in, data refreshes automatically
              }}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({new Date(s.startDate).toLocaleDateString('en-IN', { month: 'short' })} –{' '}
                  {new Date(s.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})
                </option>
              ))}
            </select>
          </div>

          {/* Add Expense Action Button */}
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white rounded-2xl font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <PlusCircleIcon className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl">
          <div className="inline-block animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full mb-3"></div>
          <p className="text-xs text-slate-500 font-semibold">Loading semester allocations and ledger data...</p>
        </div>
      )}

      {/* VIEW A: CORE OVERVIEW TABLE (All Clubs) */}
      {!loading && isCore && !selectedClubId && allClubsData && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                SVNIT Clubs Allocation Ledger • {allClubsData.semester?.name}
              </h2>
              <p className="text-xs text-slate-500">
                Click any club row to inspect event details, or use &quot;Edit budget&quot; to adjust allocations.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Campus Budget:{' '}
              </span>
              <span className="text-sm font-black text-indigo-700">
                ₹{allClubsData.totalAllocated.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Club</th>
                  <th className="py-3.5 px-4 text-right">Allocated</th>
                  <th className="py-3.5 px-4 text-right">Committed</th>
                  <th className="py-3.5 px-4 text-right">Spent</th>
                  <th className="py-3.5 px-4 text-right">Remaining</th>
                  <th className="py-3.5 px-5 w-44">% Used</th>
                  <th className="py-3.5 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {allClubsData.clubs.map((c) => {
                  const percent = c.allocated > 0 ? Math.round((c.spent / c.allocated) * 100) : 0;
                  const progressColor = getProgressColor(percent);

                  return (
                    <tr
                      key={c.clubId}
                      onClick={() => setSelectedClubId(c.clubId)}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                          {c.clubName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {c.approvedEventsCount} approved {c.approvedEventsCount === 1 ? 'event' : 'events'}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-slate-900">
                        ₹{c.allocated.toLocaleString('en-IN')}
                      </td>

                      <td className="py-4 px-4 text-right font-medium text-slate-600">
                        ₹{c.committed.toLocaleString('en-IN')}
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-indigo-700">
                        ₹{c.spent.toLocaleString('en-IN')}
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-emerald-700">
                        ₹{c.remaining.toLocaleString('en-IN')}
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span className={progressColor.text}>{percent}%</span>
                          <span className="text-[10px] text-slate-400">
                            {percent < 75 ? 'Safe' : percent < 90 ? 'Moderate' : 'Critical'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressColor.bg}`}
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClub({ id: c.clubId, name: c.clubName, currentAllocated: c.allocated });
                            setNewBudgetAmount(String(c.allocated));
                            setBudgetReason('');
                            setEditBudgetError(null);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 font-bold text-[11px] transition shadow-2xs"
                        >
                          Edit budget
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* OVERALL TOTAL ROW */}
              <tfoot>
                {(() => {
                  const overallPercent =
                    allClubsData.totalAllocated > 0
                      ? Math.round((allClubsData.totalSpent / allClubsData.totalAllocated) * 100)
                      : 0;
                  const totalColor = getProgressColor(overallPercent);

                  return (
                    <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-black text-xs text-slate-900">
                      <td className="py-4 px-5 uppercase tracking-wider">Overall Campus Total</td>
                      <td className="py-4 px-4 text-right font-black">
                        ₹{allClubsData.totalAllocated.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-700">
                        ₹{allClubsData.totalCommitted.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4 text-right font-black text-indigo-800">
                        ₹{allClubsData.totalSpent.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4 text-right font-black text-emerald-800">
                        ₹{allClubsData.totalRemaining.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span className={totalColor.text}>{overallPercent}%</span>
                          <span className="text-[10px] text-slate-500">Utilization</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${totalColor.bg}`}
                            style={{ width: `${Math.min(100, overallPercent)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-4 px-5"></td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW B: CLUB DETAIL VIEW (Executive for their own club, or Core drilled down) */}
      {!loading && clubDetail && (
        <div className="space-y-6">
          {/* Top Bar of Club Detail: Breadcrumbs / Club Title (Left) and Semester|Month Toggle & Month Selector (Right) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              {isCore && (
                <button
                  type="button"
                  onClick={() => setSelectedClubId(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <span>←</span>
                  <span>Back to All Clubs</span>
                </button>
              )}
              {isCore && <span className="text-slate-300 text-xs">•</span>}
              <div className="text-xs font-semibold text-slate-600">
                Club: <strong className="text-slate-900 font-bold">{clubDetail.club.name}</strong>
                <span className="text-slate-400 font-normal ml-1">({clubDetail.semester.name})</span>
              </div>
            </div>

            {/* Semester | Month Toggle and Month Selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewPeriod('SEMESTER')}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    viewPeriod === 'SEMESTER'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semester
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewPeriod('MONTH');
                    if (!selectedMonth && clubDetail.monthlySpending.length > 0) {
                      setSelectedMonth(clubDetail.monthlySpending[0].month);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    viewPeriod === 'MONTH'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Month
                </button>
              </div>

              {viewPeriod === 'MONTH' && (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Month:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 shadow-2xs"
                  >
                    {clubDetail.monthlySpending.map((m) => (
                      <option key={m.month} value={m.month}>
                        {m.month} (₹{m.spent.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* FOUR METRIC CARDS (MONTH-AWARE) */}
          {(() => {
            const currentMonthObj = clubDetail.monthlySpending.find((m) => m.month === selectedMonth);
            const isMonthMode = viewPeriod === 'MONTH';
            const spentDisplay = isMonthMode
              ? (currentMonthObj ? currentMonthObj.spent : 0)
              : clubDetail.spent;
            const remainingDisplay = isMonthMode
              ? clubDetail.allocated - spentDisplay
              : clubDetail.remaining;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Allocated */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs relative overflow-hidden">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Allocated Budget
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    ₹{clubDetail.allocated.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium">
                    Fixed semester allocation
                  </div>
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
                    <RupeeIcon className="w-5 h-5" />
                  </div>
                </div>

                {/* Card 2: Committed */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs relative overflow-hidden">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Committed Budget
                  </div>
                  <div className="text-2xl font-black text-indigo-700 tracking-tight">
                    ₹{clubDetail.committed.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium">
                    Approved events total
                  </div>
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                </div>

                {/* Card 3: Spent */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs relative overflow-hidden">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {isMonthMode ? `Spent in ${selectedMonth}` : 'Total Spent'}
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    ₹{spentDisplay.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium">
                    {isMonthMode
                      ? `${selectedMonth} actual expenses`
                      : clubDetail.allocated > 0
                      ? `${Math.round((clubDetail.spent / clubDetail.allocated) * 100)}% of allocation`
                      : '0% utilized'}
                  </div>
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <ReceiptIcon className="w-5 h-5" />
                  </div>
                </div>

                {/* Card 4: Remaining */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs relative overflow-hidden">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Remaining Balance
                  </div>
                  <div
                    className={`text-2xl font-black tracking-tight ${
                      remainingDisplay >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    ₹{remainingDisplay.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium">
                    {isMonthMode ? `Allocated − ${selectedMonth} Spent` : 'Allocated − Actual Spent'}
                  </div>
                  <div
                    className={`absolute top-4 right-4 w-10 h-10 rounded-2xl flex items-center justify-center border ${
                      remainingDisplay >= 0
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        : 'bg-rose-50 border-rose-100 text-rose-600'
                    }`}
                  >
                    <RupeeIcon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* VISUAL CHARTS: DONUT CHART & MONTHLY SPENDING BAR CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. DONUT CHART: SPENT VS. REMAINING */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Fund Utilization Donut • Spent vs. Remaining
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Semester allocation breakdown for {clubDetail.semester.name}.
                </p>
              </div>

              {(() => {
                const radius = 54;
                const circumference = 2 * Math.PI * radius;
                const allocated = clubDetail.allocated || 1;
                const spent = clubDetail.spent || 0;
                const remaining = Math.max(0, clubDetail.remaining);

                const percentSpent = Math.min(100, Math.round((spent / allocated) * 100));
                const spentDash = (percentSpent / 100) * circumference;

                return (
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                    {/* Donut SVG */}
                    <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                        {/* Background circle (Remaining portion) */}
                        <circle
                          cx="70"
                          cy="70"
                          r={radius}
                          stroke="#10b981"
                          strokeWidth="14"
                          fill="transparent"
                          className="opacity-90"
                        />
                        {/* Foreground arc (Spent portion) */}
                        <circle
                          cx="70"
                          cy="70"
                          r={radius}
                          stroke="#6366f1"
                          strokeWidth="14"
                          strokeDasharray={`${spentDash} ${circumference}`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                          fill="transparent"
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center text-center">
                        <span className="text-2xl font-black text-slate-900">{percentSpent}%</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Spent
                        </span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                      <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                          <span className="text-[10px] font-bold text-slate-600">Actual Spent</span>
                        </div>
                        <div className="text-sm font-black text-indigo-900">
                          ₹{spent.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="text-[10px] font-bold text-slate-600">Remaining</span>
                        </div>
                        <div className="text-sm font-black text-emerald-900">
                          ₹{remaining.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 mb-0.5">Committed</div>
                        <div className="text-sm font-black text-slate-800">
                          ₹{clubDetail.committed.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 mb-0.5">Available to Plan</div>
                        <div className="text-sm font-black text-slate-800">
                          ₹{clubDetail.availableToPlan.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 2. MONTHLY SPENDING BAR CHART WITH AVERAGE MARKER */}
            {(() => {
              const monthlyItems = clubDetail.monthlySpending || [];
              const totalMonths = monthlyItems.length || 1;
              const sumSpent = monthlyItems.reduce((acc, m) => acc + m.spent, 0);
              const avgMonthlySpend = Math.round(sumSpent / totalMonths);
              const maxMonthlySpend = Math.max(...monthlyItems.map((m) => m.spent), avgMonthlySpend, 1000);

              return (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-900">
                        Monthly Spending Breakdown
                      </h3>
                      {avgMonthlySpend > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                          Avg: ₹{avgMonthlySpend.toLocaleString('en-IN')}/mo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                      Spent per month across semester. Click any bar to inspect that month.
                    </p>
                  </div>

                  {/* Chart Graphic Area */}
                  <div className="relative pt-6 pb-2">
                    {/* Average Line Across Chart */}
                    {avgMonthlySpend > 0 && maxMonthlySpend > 0 && (
                      <div
                        className="absolute inset-x-0 border-b-2 border-dashed border-indigo-300 z-10 pointer-events-none flex items-center justify-end"
                        style={{
                          bottom: `${Math.min(88, Math.max(12, Math.round((avgMonthlySpend / maxMonthlySpend) * 115) + 24))}px`,
                        }}
                      >
                        <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs -translate-y-2.5">
                          Avg ₹{avgMonthlySpend.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {/* Bars Container */}
                    <div className="flex items-end justify-between gap-2 h-40 px-2 border-b border-slate-200">
                      {monthlyItems.map((m) => {
                        const isSelected = viewPeriod === 'MONTH' && selectedMonth === m.month;
                        const heightPx = maxMonthlySpend > 0
                          ? Math.max(6, Math.round((m.spent / maxMonthlySpend) * 115))
                          : 6;

                        return (
                          <div
                            key={m.month}
                            onClick={() => {
                              setSelectedMonth(m.month);
                              setViewPeriod('MONTH');
                            }}
                            className="flex-1 flex flex-col items-center justify-end group cursor-pointer"
                            title={`${m.month}: ₹${m.spent.toLocaleString('en-IN')} (${m.expenseCount} expenses). Click to inspect.`}
                          >
                            {/* Amount label above bar */}
                            <span
                              className={`text-[10px] font-bold mb-1 transition-colors ${
                                isSelected
                                  ? 'text-indigo-700 font-extrabold'
                                  : m.spent > 0
                                  ? 'text-slate-600 group-hover:text-indigo-600'
                                  : 'text-slate-300'
                              }`}
                            >
                              {m.spent > 0 ? `₹${(m.spent / 1000).toFixed(m.spent >= 10000 ? 0 : 1)}k` : '₹0'}
                            </span>

                            {/* Bar Column */}
                            <div className="w-full max-w-[42px] flex items-end justify-center">
                              <div
                                className={`w-full rounded-t-lg transition-all duration-300 ${
                                  isSelected
                                    ? 'bg-indigo-600 ring-2 ring-indigo-400 ring-offset-1 shadow-md'
                                    : m.spent > 0
                                    ? 'bg-indigo-400/80 group-hover:bg-indigo-500'
                                    : 'bg-slate-200 group-hover:bg-slate-300'
                                }`}
                                style={{ height: `${heightPx}px` }}
                              />
                            </div>

                            {/* Month label below baseline */}
                            <span
                              className={`text-[10px] font-bold mt-2 truncate max-w-full text-center transition-colors ${
                                isSelected
                                  ? 'text-indigo-700 underline font-extrabold'
                                  : 'text-slate-500 group-hover:text-slate-800'
                              }`}
                            >
                              {m.month.split(' ')[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* EVENTS & MONTHLY LEDGER SECTION */}
          {(() => {
            const isMonthMode = viewPeriod === 'MONTH';
            const currentMonthObj = clubDetail.monthlySpending.find((m) => m.month === selectedMonth);
            const hasMonthExpenses = currentMonthObj ? currentMonthObj.expenseCount > 0 : false;

            // In Month mode with 0 expenses: show empty state
            if (isMonthMode && !hasMonthExpenses) {
              return (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-900 shadow-xs space-y-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                    <ReceiptIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">
                    No Expenses in {selectedMonth}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {clubDetail.club.name} recorded zero expenses during {selectedMonth}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewPeriod('SEMESTER')}
                    className="mt-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition cursor-pointer"
                  >
                    Switch to Full Semester View
                  </button>
                </div>
              );
            }

            // Events rows to display:
            // In Month mode: show only events that have expenses dated in selectedMonth, with spent = month spent
            // In Semester mode: show all perEventRows
            const eventsToDisplay = isMonthMode
              ? clubDetail.perEventRows
                  .map((ev) => {
                    const mExpenses = (ev.expenses || []).filter((ex: any) =>
                      isExpenseInMonth(ex.expenseDate, selectedMonth)
                    );
                    const mSpent = mExpenses.reduce(
                      (sum: number, ex: any) => sum + Math.round(Number(ex.amount || 0)),
                      0
                    );
                    return {
                      ...ev,
                      spent: mSpent,
                      left: ev.budget - mSpent,
                      expenses: mExpenses,
                    };
                  })
                  .filter((ev) => ev.expenses.length > 0)
              : clubDetail.perEventRows;

            // Itemized expenses ledger in Month mode
            const monthLedgerExpenses: any[] = [];
            if (isMonthMode) {
              eventsToDisplay.forEach((ev) => {
                ev.expenses.forEach((ex: any) => {
                  monthLedgerExpenses.push({
                    ...ex,
                    eventTitle: ev.title,
                    eventVenue: ev.venue,
                  });
                });
              });
              monthLedgerExpenses.sort(
                (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
              );
            }

            return (
              <div className="space-y-6">
                {/* Events Table */}
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {isMonthMode
                          ? `${clubDetail.club.name} • Events with Expenses in ${selectedMonth}`
                          : `${clubDetail.club.name} • Events & Budget Tracker`}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isMonthMode
                          ? `Showing only expenses dated in ${selectedMonth}. Click an event to view receipts.`
                          : 'Click any event row to inspect its itemized expense entries and receipts.'}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      {eventsToDisplay.length} {eventsToDisplay.length === 1 ? 'event' : 'events'}
                    </span>
                  </div>

                  {eventsToDisplay.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                      {isMonthMode
                        ? `No event expenses recorded in ${selectedMonth}.`
                        : `No events registered for this club in ${clubDetail.semester.name}.`}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            <th className="py-3.5 px-5">Event</th>
                            <th className="py-3.5 px-4">Date</th>
                            <th className="py-3.5 px-4 text-right">Budget</th>
                            <th className="py-3.5 px-4 text-right">
                              {isMonthMode ? `Spent (${selectedMonth.split(' ')[0]})` : 'Spent'}
                            </th>
                            <th className="py-3.5 px-4 text-right">Left</th>
                            <th className="py-3.5 px-5 w-48">Progress</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {eventsToDisplay.map((ev) => {
                            const isOverBudget = ev.spent > ev.budget;
                            const overAmount = ev.spent - ev.budget;
                            const percent = ev.budget > 0 ? Math.min(100, Math.round((ev.spent / ev.budget) * 100)) : 0;

                            return (
                              <tr
                                key={ev.id}
                                onClick={() => setActiveEventPanel(ev)}
                                className={`hover:bg-slate-50/80 transition cursor-pointer group ${
                                  activeEventPanel?.id === ev.id ? 'bg-indigo-50/40' : ''
                                }`}
                              >
                                <td className="py-4 px-5">
                                  <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                                    {ev.title}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                      {ev.eventType}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{ev.venue}</span>
                                  </div>
                                </td>

                                <td className="py-4 px-4 font-medium text-slate-600 whitespace-nowrap">
                                  {new Date(ev.startTime).toLocaleDateString('en-IN', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </td>

                                <td className="py-4 px-4 text-right font-bold text-slate-900">
                                  ₹{ev.budget.toLocaleString('en-IN')}
                                </td>

                                <td className="py-4 px-4 text-right font-bold text-indigo-700">
                                  ₹{ev.spent.toLocaleString('en-IN')}
                                </td>

                                <td className="py-4 px-4 text-right font-bold">
                                  {isOverBudget ? (
                                    <span className="text-rose-600">₹0</span>
                                  ) : (
                                    <span className="text-emerald-700">₹{ev.left.toLocaleString('en-IN')}</span>
                                  )}
                                </td>

                                <td className="py-4 px-5">
                                  {isOverBudget ? (
                                    <div className="space-y-1">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-black">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                        Over by ₹{overAmount.toLocaleString('en-IN')}
                                      </span>
                                      <div className="w-full bg-rose-100 rounded-full h-2 overflow-hidden">
                                        <div className="h-full bg-rose-600 rounded-full w-full" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                        <span>{percent}%</span>
                                        <span>₹{ev.left.toLocaleString('en-IN')} left</span>
                                      </div>
                                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ${
                                            percent < 75 ? 'bg-emerald-500' : 'bg-amber-500'
                                          }`}
                                          style={{ width: `${percent}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* In Month mode: Itemized Monthly Expense Ledger */}
                {isMonthMode && monthLedgerExpenses.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {selectedMonth} Itemized Expense Ledger
                        </h3>
                        <p className="text-xs text-slate-500">
                          Complete list of expenses recorded for {clubDetail.club.name} dated in {selectedMonth}.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        {monthLedgerExpenses.length} entries
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Event</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Description</th>
                            <th className="py-3 px-4 text-right">Amount</th>
                            <th className="py-3 px-4">Added By</th>
                            <th className="py-3 px-4 text-center">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {monthLedgerExpenses.map((ex: any) => {
                            const catInfo = CATEGORY_COLORS[ex.category] || { label: ex.category };
                            return (
                              <tr key={ex.id} className="hover:bg-slate-50/80 transition">
                                <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                                  {new Date(ex.expenseDate).toLocaleDateString('en-IN', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-900">
                                  {ex.eventTitle}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                    {catInfo.label}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-800 font-medium max-w-xs truncate">
                                  {ex.description || '—'}
                                </td>
                                <td className="py-3 px-4 text-right font-black text-slate-900">
                                  ₹{Math.round(Number(ex.amount)).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-4 text-slate-600 text-[11px]">
                                  {ex.addedByName || ex.submittedBy?.name || 'Club Executive'}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {ex.receiptUrl ? (
                                    <a
                                      href={ex.receiptUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                    >
                                      View ↗
                                    </a>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* EVENT EXPENSES PANEL (CLICKING AN EVENT OPENS THIS DRAWER / PANEL) */}
      {currentPanelEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 text-slate-900 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header: ₹X spent of ₹Y, ₹Z left */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="text-base font-black text-slate-900">
                  {currentPanelEvent.spent > currentPanelEvent.budget ? (
                    <span className="text-rose-700">
                      ₹{currentPanelEvent.spent.toLocaleString('en-IN')} spent of ₹
                      {currentPanelEvent.budget.toLocaleString('en-IN')}, Over by ₹
                      {(currentPanelEvent.spent - currentPanelEvent.budget).toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span>
                      ₹{currentPanelEvent.spent.toLocaleString('en-IN')} spent of ₹
                      {currentPanelEvent.budget.toLocaleString('en-IN')}, ₹
                      {currentPanelEvent.left.toLocaleString('en-IN')} left
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-semibold text-slate-600 mt-0.5">
                  {currentPanelEvent.title} • {currentPanelEvent.venue}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setActiveEventPanel(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition font-bold"
              >
                ✕
              </button>
            </div>

            {/* Expenses List */}
            {currentPanelEvent.expenses.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No individual expenses recorded for this event yet. Use the &quot;Add Expense&quot; button to record an expense.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3">Added By</th>
                      <th className="py-2.5 px-3 text-center">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentPanelEvent.expenses.map((ex: any) => {
                      const catInfo = CATEGORY_COLORS[ex.category] || { label: ex.category };

                      return (
                        <tr key={ex.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                            {new Date(ex.expenseDate).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>

                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                              {catInfo.label}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-slate-800 font-medium max-w-xs truncate">
                            {ex.description || '—'}
                          </td>

                          <td className="py-3 px-3 text-right font-black text-slate-900">
                            ₹{Math.round(Number(ex.amount)).toLocaleString('en-IN')}
                          </td>

                          <td className="py-3 px-3 text-slate-600 text-[11px]">
                            {ex.addedByName || ex.submittedBy?.name || 'Club Executive'}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {ex.receiptUrl ? (
                              <a
                                href={ex.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                              >
                                View ↗
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveEventPanel(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BUDGET MODAL (CORE ONLY) */}
      {editingClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl relative space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Club Budget Allocation</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adjust fixed semester allocation for <strong>{editingClub.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingClub(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {editBudgetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {editBudgetError}
              </div>
            )}

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Allocation Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={newBudgetAmount}
                    onChange={(e) => setNewBudgetAmount(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Required Justification Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={budgetReason}
                  onChange={(e) => setBudgetReason(e.target.value)}
                  placeholder="e.g. Mid-semester grant for annual hackathon prize pool"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
                <span className="text-[10px] text-slate-400">
                  Every budget modification is logged in the immutable audit change log.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClub(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {savingBudget ? 'Saving...' : 'Save Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSuccess={async () => {
          setIsAddExpenseOpen(false);
          await fetchBudgetData();
          await fetchEvents();
        }}
        currentRole={currentRole}
        currentUser={currentUser}
        approvedEvents={allEvents.filter((e) => e.status === 'APPROVED' || e.status === 'COMPLETED')}
        currentTotalSpent={clubDetail?.spent || allClubsData?.totalSpent || 0}
      />
    </div>
  );
}
