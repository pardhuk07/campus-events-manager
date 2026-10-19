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
import { CATEGORY_COLORS, getClubTheme } from '@/lib/colors';
import { ExpenseCategory, UserRole } from '@/lib/constants';

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

interface NeedsAttentionItem {
  expenseId: string;
  title: string;
  amount: number;
  expenseDate: string;
  eventTitle?: string;
  eventId?: string;
  reason: string;
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
  expenses: any[];
  needsAttention: NeedsAttentionItem[];
  changeLogs?: any[];
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

  // Available clubs list for Core switcher
  const [availableClubs, setAvailableClubs] = useState<Array<{ id: string; name: string }>>([]);

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

  // Edit Club Budget Modal (Core only)
  const [editingClub, setEditingClub] = useState<{ id: string; name: string; currentAllocated: number } | null>(null);
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [budgetReason, setBudgetReason] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [editBudgetError, setEditBudgetError] = useState<string | null>(null);
  const [confirmClubBudgetPrompt, setConfirmClubBudgetPrompt] = useState(false);

  // Edit Event Budget Modal (Core only)
  const [editingEventBudget, setEditingEventBudget] = useState<{ id: string; title: string; currentBudget: number } | null>(null);
  const [newEventBudgetAmount, setNewEventBudgetAmount] = useState('');
  const [savingEventBudget, setSavingEventBudget] = useState(false);
  const [eventBudgetError, setEventBudgetError] = useState<string | null>(null);
  const [confirmEventBudgetPrompt, setConfirmEventBudgetPrompt] = useState(false);

  // Edit Expense Modal (Core only)
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [editExpAmount, setEditExpAmount] = useState('');
  const [editExpCategory, setEditExpCategory] = useState<string>(ExpenseCategory.FOOD);
  const [editExpDate, setEditExpDate] = useState('');
  const [editExpDescription, setEditExpDescription] = useState('');
  const [editExpEventId, setEditExpEventId] = useState('');
  const [editExpReceiptUrl, setEditExpReceiptUrl] = useState('');
  const [editExpReason, setEditExpReason] = useState('');
  const [editExpError, setEditExpError] = useState<string | null>(null);
  const [savingExpenseEdit, setSavingExpenseEdit] = useState(false);
  const [confirmExpenseEditPrompt, setConfirmExpenseEditPrompt] = useState(false);

  // Void Expense Modal (Core only)
  const [voidingExpense, setVoidingExpense] = useState<any | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  // History Modal
  const [historyExpense, setHistoryExpense] = useState<any | null>(null);
  const [expenseHistoryRecords, setExpenseHistoryRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Ledger controls: Semester vs Month, and Show Voided toggle
  const [viewPeriod, setViewPeriod] = useState<'SEMESTER' | 'MONTH'>('SEMESTER');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [showVoided, setShowVoided] = useState<boolean>(false);

  // Event Expenses Panel (opened upon clicking an event row)
  const [activeEventPanel, setActiveEventPanel] = useState<PerEventRow | null>(null);

  // Add Expense Modal
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

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

  // URL Query Sync: store ?club=... in URL for Core
  const handleClubSelect = useCallback((clubId: string | null) => {
    setSelectedClubId(clubId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (clubId) {
        url.searchParams.set('club', clubId);
      } else {
        url.searchParams.delete('club');
      }
      window.history.pushState({}, '', url.toString());
    }
  }, []);

  // Sync club from URL on mount for Core
  useEffect(() => {
    if (typeof window !== 'undefined' && isCore) {
      const params = new URLSearchParams(window.location.search);
      const clubParam = params.get('club');
      if (clubParam) {
        setSelectedClubId(clubParam);
      }
    }
  }, [isCore]);

  // 1. Load Semesters on Mount
  useEffect(() => {
    async function loadSemesters() {
      try {
        const res = await fetch('/api/semesters');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSemesters(json.data);

          const now = new Date();
          const currentSem = json.data.find((s: Semester) => {
            const start = new Date(s.startDate);
            const end = new Date(s.endDate);
            return now >= start && now <= end;
          });

          setSelectedSemesterId(currentSem ? currentSem.id : json.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load semesters:', err);
      }
    }
    loadSemesters();
  }, []);

  // 2. Load Clubs for Dropdown
  useEffect(() => {
    async function loadClubs() {
      try {
        const res = await fetch('/api/clubs');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAvailableClubs(json.data.map((c: any) => ({ id: c.id, name: c.name })));
        }
      } catch (err) {
        console.error('Failed to load clubs:', err);
      }
    }
    loadClubs();
  }, []);

  // 3. Fetch events
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

  // 4. Fetch Budget Data based on active semester and role
  const fetchBudgetData = useCallback(async () => {
    if (!selectedSemesterId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isExec) {
        if (!currentUser?.clubId) {
          setErrorMsg('Your executive account is not associated with an SVNIT club.');
          setLoading(false);
          return;
        }

        const res = await fetch(
          `/api/club-budgets?semesterId=${encodeURIComponent(selectedSemesterId)}&clubId=${encodeURIComponent(
            currentUser.clubId
          )}`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setClubDetail(json.data);
          setSelectedClubId(currentUser.clubId);
        } else {
          setErrorMsg(json.error?.message || 'Failed to load club budget details.');
        }
      } else if (isCore) {
        if (selectedClubId) {
          const res = await fetch(
            `/api/club-budgets?semesterId=${encodeURIComponent(selectedSemesterId)}&clubId=${encodeURIComponent(
              selectedClubId
            )}`
          );
          const json = await res.json();
          if (json.success && json.data) {
            setClubDetail(json.data);
          } else {
            setErrorMsg(json.error?.message || 'Failed to load club budget details.');
          }
        } else {
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

  // --- ACTIONS (CORE ONLY) ---

  // 1. Save Club Semester Allocation
  const handleSaveClubBudget = async () => {
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
        setConfirmClubBudgetPrompt(false);
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

  // 2. Save Event Approved Budget
  const handleSaveEventBudget = async () => {
    if (!editingEventBudget) return;

    setEventBudgetError(null);
    const parsedAmt = parseFloat(newEventBudgetAmount);
    if (isNaN(parsedAmt) || parsedAmt < 0) {
      setEventBudgetError('Please enter a valid non-negative approved budget amount.');
      return;
    }

    setSavingEventBudget(true);
    try {
      const res = await fetch(`/api/events/${editingEventBudget.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': UserRole.CORE_VERIFIER,
        },
        body: JSON.stringify({
          approvedBudget: Math.round(parsedAmt),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setEditingEventBudget(null);
        setNewEventBudgetAmount('');
        setConfirmEventBudgetPrompt(false);
        await fetchBudgetData();
        await fetchEvents();
      } else {
        setEventBudgetError(json.error?.message || 'Failed to update event approved budget.');
      }
    } catch (err: any) {
      setEventBudgetError(err.message || 'Network error updating event budget.');
    } finally {
      setSavingEventBudget(false);
    }
  };

  // 3. Open Edit Expense Modal
  const openEditExpenseModal = (ex: any) => {
    setEditingExpense(ex);
    setEditExpAmount(String(Math.round(Number(ex.amount || 0))));
    setEditExpCategory(ex.category || ExpenseCategory.FOOD);
    setEditExpDate(ex.expenseDate ? new Date(ex.expenseDate).toISOString().split('T')[0] : '');
    setEditExpDescription(ex.description || '');
    setEditExpEventId(ex.eventId || '');
    setEditExpReceiptUrl(ex.receiptUrl || '');
    setEditExpReason('');
    setEditExpError(null);
    setConfirmExpenseEditPrompt(false);
  };

  // 4. Save Edited Expense
  const handleSaveExpenseEdit = async () => {
    if (!editingExpense) return;

    setEditExpError(null);
    const parsedAmt = parseFloat(editExpAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setEditExpError('Please enter a valid expense amount greater than 0.');
      return;
    }

    if (!editExpReason.trim()) {
      setEditExpError('A reason is strictly required to modify an existing expense.');
      return;
    }

    setSavingExpenseEdit(true);
    try {
      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': UserRole.CORE_VERIFIER,
        },
        body: JSON.stringify({
          amount: Math.round(parsedAmt),
          category: editExpCategory,
          expenseDate: editExpDate ? new Date(editExpDate) : undefined,
          description: editExpDescription.trim(),
          eventId: editExpEventId || undefined,
          receiptUrl: editExpReceiptUrl.trim() || null,
          reason: editExpReason.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setEditingExpense(null);
        setConfirmExpenseEditPrompt(false);
        await fetchBudgetData();
        await fetchEvents();
      } else {
        setEditExpError(json.error?.message || 'Failed to edit expense.');
      }
    } catch (err: any) {
      setEditExpError(err.message || 'Network error editing expense.');
    } finally {
      setSavingExpenseEdit(false);
    }
  };

  // 5. Void Expense
  const handleVoidExpense = async () => {
    if (!voidingExpense) return;

    setVoidError(null);
    if (!voidReason.trim()) {
      setVoidError('A reason is strictly required to void an expense.');
      return;
    }

    setIsVoiding(true);
    try {
      const res = await fetch(`/api/expenses/${voidingExpense.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': UserRole.CORE_VERIFIER,
        },
        body: JSON.stringify({
          reason: voidReason.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setVoidingExpense(null);
        setVoidReason('');
        await fetchBudgetData();
        await fetchEvents();
      } else {
        setVoidError(json.error?.message || 'Failed to void expense.');
      }
    } catch (err: any) {
      setVoidError(err.message || 'Network error voiding expense.');
    } finally {
      setIsVoiding(false);
    }
  };

  // 6. View Expense History
  const openExpenseHistory = async (ex: any) => {
    setHistoryExpense(ex);
    setLoadingHistory(true);
    setExpenseHistoryRecords([]);
    try {
      const res = await fetch(`/api/expenses/${ex.id}/history`, {
        headers: {
          'x-user-role': currentRole,
        },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.history)) {
        setExpenseHistoryRecords(json.data.history);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Helper for progress bar color threshold
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
    let evExpenses = found.expenses || [];
    if (!showVoided) {
      evExpenses = evExpenses.filter((ex: any) => !ex.isVoided);
    }
    if (viewPeriod === 'MONTH') {
      evExpenses = evExpenses.filter((ex: any) => isExpenseInMonth(ex.expenseDate, selectedMonth));
    }
    const filteredSpent = evExpenses
      .filter((ex: any) => !ex.isVoided)
      .reduce((sum: number, ex: any) => sum + Math.round(Number(ex.amount || 0)), 0);

    return {
      ...found,
      spent: filteredSpent,
      left: found.budget - filteredSpent,
      expenses: evExpenses,
    };
  }, [activeEventPanel, clubDetail, viewPeriod, selectedMonth, showVoided, isExpenseInMonth]);

  // Ledger expenses based on viewPeriod and showVoided
  const filteredLedgerExpenses = useMemo(() => {
    if (!clubDetail) return [];
    let list = clubDetail.expenses || [];

    if (viewPeriod === 'MONTH' && selectedMonth) {
      list = list.filter((ex: any) => isExpenseInMonth(ex.expenseDate, selectedMonth));
    }

    if (!showVoided) {
      list = list.filter((ex: any) => !ex.isVoided);
    }

    return list;
  }, [clubDetail, viewPeriod, selectedMonth, showVoided, isExpenseInMonth]);

  // Events filtered for "Add Expense" modal: limited to selected club when Core is in club mode
  const addExpenseApprovedEvents = useMemo(() => {
    const approved = allEvents.filter((e) => e.status === 'APPROVED' || e.status === 'COMPLETED');
    if (isCore && selectedClubId) {
      return approved.filter((e) => e.clubId === selectedClubId || e.club?.id === selectedClubId);
    }
    return approved;
  }, [allEvents, isCore, selectedClubId]);

  return (
    <div className="space-y-6">
      {/* Top Header & Selectors */}
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
                  ? 'Deep-dive event audit and expense tracking (Core mode)'
                  : 'Centralized semester fund monitoring for all SVNIT campus clubs'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Club Switcher (Core only), Semester Selector & Add Expense */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Core Club Switcher */}
          {isCore && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Club:</span>
              <select
                value={selectedClubId || ''}
                onChange={(e) => handleClubSelect(e.target.value || null)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="">All clubs (overview)</option>
                {availableClubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Semester Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 shadow-2xs">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            <select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
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

          {/* Add Expense Button */}
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
                {allClubsData.clubs.length} Registered Clubs
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
                  <th className="py-3.5 px-5 w-48">% Used</th>
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
                      onClick={() => handleClubSelect(c.clubId)}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition flex items-center gap-2">
                          <span>{c.clubName}</span>
                          <span className="text-[10px] text-slate-400 group-hover:translate-x-1 transition font-medium">
                            →
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {c.approvedEventsCount} approved event{c.approvedEventsCount === 1 ? '' : 's'}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right font-black text-slate-900">
                        ₹{c.allocated.toLocaleString('en-IN')}
                      </td>

                      <td className="py-4 px-4 text-right font-medium text-slate-700">
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
                            setConfirmClubBudgetPrompt(false);
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

      {/* VIEW B: CLUB DETAIL VIEW (Executive for own club, or Core drilled down) */}
      {!loading && clubDetail && (
        <div className="space-y-6">
          {/* Managing Banner (Core Mode) in Club Color */}
          {isCore && (
            (() => {
              const theme = getClubTheme(clubDetail.club.name);
              return (
                <div
                  className={`p-4 rounded-3xl border ${theme.bg} ${theme.border} ${theme.text} flex items-center justify-between shadow-xs`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-3.5 h-3.5 rounded-full ${theme.dot}`} />
                    <span className="font-black text-sm tracking-tight">
                      Managing: {clubDetail.club.name} (Core mode)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClub({
                          id: clubDetail.club.id,
                          name: clubDetail.club.name,
                          currentAllocated: clubDetail.allocated,
                        });
                        setNewBudgetAmount(String(clubDetail.allocated));
                        setBudgetReason('');
                        setEditBudgetError(null);
                        setConfirmClubBudgetPrompt(false);
                      }}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 border border-slate-200 transition shadow-2xs"
                    >
                      Edit Club Budget
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClubSelect(null)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition shadow-2xs"
                    >
                      ← Back to All Clubs
                    </button>
                  </div>
                </div>
              );
            })()
          )}

          {/* Needs Attention Warning Panel (Core only) */}
          {isCore && clubDetail.needsAttention && clubDetail.needsAttention.length > 0 && (
            <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-3xl text-amber-900 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-sm font-black text-amber-900">
                  Needs Attention: {clubDetail.needsAttention.length} expense{clubDetail.needsAttention.length > 1 ? 's' : ''} flagged
                </h3>
              </div>
              <p className="text-xs text-amber-800">
                The following expenses fall outside defined semesters or their dates mismatch their linked event&apos;s academic semester. They are excluded from semester spending totals and ledger calculations until reconciled.
              </p>
              <div className="divide-y divide-amber-200/60 bg-white/80 rounded-2xl border border-amber-200 overflow-hidden text-xs">
                {clubDetail.needsAttention.map((item, idx) => (
                  <div key={item.expenseId || idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-indigo-700 font-black">₹{item.amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Linked Event: <strong>{item.eventTitle || 'Unknown Event'}</strong> • Recorded Date:{' '}
                        {new Date(item.expenseDate).toLocaleDateString('en-IN')}
                      </div>
                      <div className="text-[11px] text-rose-700 font-semibold mt-0.5">
                        ⚠️ {item.reason}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const ex = (clubDetail.expenses || []).find((e: any) => e.id === item.expenseId);
                          if (ex) openEditExpenseModal(ex);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-2xs"
                      >
                        Reconcile Expense
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Bar of Club Detail: Club Info & Period Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <div className="text-xs font-semibold text-slate-600">
              Club: <strong className="text-slate-900 font-bold">{clubDetail.club.name}</strong>
              <span className="text-slate-400 font-normal ml-1">({clubDetail.semester.name})</span>
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
                      ? `${selectedMonth} verified expenses`
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

          {/* VISUAL CHARTS SECTION: DONUT (LEFT) + MONTHLY SPENDING BARS (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. DONUT CHART */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Budget Utilization Ratio</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Visual ratio of actual spent funds versus remaining balance for this semester.
                </p>
              </div>

              {(() => {
                const allocated = clubDetail.allocated;
                const spent = clubDetail.spent;
                const remaining = Math.max(0, clubDetail.remaining);
                const percentSpent = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;

                const radius = 64;
                const circumference = 2 * Math.PI * radius;
                const spentDash = (percentSpent / 100) * circumference;

                return (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                        <circle
                          cx="80"
                          cy="80"
                          r={radius}
                          stroke="#e2e8f0"
                          strokeWidth="14"
                          fill="transparent"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r={radius}
                          stroke="#4f46e5"
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
                      Spent per month across semester in chronological order. Click any bar to filter that month.
                    </p>
                  </div>

                  <div className="relative pt-6 pb-2">
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
                            title={`${m.month}: ₹${m.spent.toLocaleString('en-IN')} (${m.expenseCount} expenses). Click to filter.`}
                          >
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

          {/* EVENTS & ITEMISED LEDGER SECTION */}
          {(() => {
            const isMonthMode = viewPeriod === 'MONTH';
            const eventsToDisplay = isMonthMode
              ? clubDetail.perEventRows
                  .map((ev) => {
                    const mExpenses = (ev.expenses || [])
                      .filter((ex: any) => !ex.isVoided)
                      .filter((ex: any) => isExpenseInMonth(ex.expenseDate, selectedMonth));
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
                          ? `Showing only expenses dated in ${selectedMonth}. Click an event row to inspect receipts.`
                          : 'Click any event row to inspect its expenses. Core can edit approved budgets.'}
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
                            <th className="py-3.5 px-5 w-44">Progress</th>
                            {isCore && <th className="py-3.5 px-4 text-center">Action</th>}
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

                                {isCore && (
                                  <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingEventBudget({
                                          id: ev.id,
                                          title: ev.title,
                                          currentBudget: ev.budget,
                                        });
                                        setNewEventBudgetAmount(String(ev.budget));
                                        setEventBudgetError(null);
                                        setConfirmEventBudgetPrompt(false);
                                      }}
                                      className="px-2.5 py-1 rounded-xl border border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 font-bold text-[11px] transition shadow-2xs cursor-pointer"
                                    >
                                      Edit budget
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* ITEMISED EXPENSE LEDGER (WITH VOIDED TOGGLE & AUDIT ATTRIBUTION) */}
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {isMonthMode
                          ? `${selectedMonth} Itemized Expense Ledger`
                          : `${clubDetail.club.name} • Semester Expense Ledger`}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isMonthMode
                          ? `All expenses recorded for ${clubDetail.club.name} dated in ${selectedMonth}.`
                          : `Complete ledger of expenses dated within ${clubDetail.semester.name}.`}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Show Voided Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={showVoided}
                          onChange={(e) => setShowVoided(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Show voided expenses</span>
                      </label>

                      <span className="text-xs font-bold text-slate-500">
                        {filteredLedgerExpenses.length} entries
                      </span>
                    </div>
                  </div>

                  {filteredLedgerExpenses.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                      {isMonthMode
                        ? `No expenses found for ${selectedMonth}.`
                        : `No expenses recorded for this club in ${clubDetail.semester.name}.`}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Event</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Description</th>
                            <th className="py-3 px-4 text-right">Amount</th>
                            <th className="py-3 px-4">Attribution / Added By</th>
                            <th className="py-3 px-4 text-center">Receipt</th>
                            <th className="py-3 px-4 text-center">Audit</th>
                            {isCore && <th className="py-3 px-4 text-center">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredLedgerExpenses.map((ex: any) => {
                            const catInfo = CATEGORY_COLORS[ex.category] || { label: ex.category };

                            return (
                              <tr
                                key={ex.id}
                                className={`hover:bg-slate-50/80 transition ${
                                  ex.isVoided ? 'bg-rose-50/40 opacity-75' : ''
                                }`}
                              >
                                <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                                  {new Date(ex.expenseDate).toLocaleDateString('en-IN', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </td>

                                <td className="py-3 px-4 font-bold text-slate-900">
                                  {ex.eventTitle || '—'}
                                </td>

                                <td className="py-3 px-4">
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                    {catInfo.label}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-slate-800 font-medium max-w-xs">
                                  <div className="truncate">{ex.description || '—'}</div>
                                  {ex.isVoided && (
                                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                        Voided
                                      </span>
                                      <span className="text-[10px] text-rose-700 italic">
                                        by {ex.voidedBy || 'Core'}: &quot;{ex.voidReason}&quot;
                                      </span>
                                    </div>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                                  {ex.isVoided ? (
                                    <span className="line-through text-slate-400">
                                      ₹{Math.round(Number(ex.amount)).toLocaleString('en-IN')}
                                    </span>
                                  ) : (
                                    <span>₹{Math.round(Number(ex.amount)).toLocaleString('en-IN')}</span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-slate-600 text-[11px]">
                                  {ex.onBehalfOfClub ? (
                                    <span className="font-semibold text-indigo-700">
                                      Added by ACM Core on behalf of {ex.onBehalfOfClub}
                                    </span>
                                  ) : (
                                    <span>{ex.addedByName || ex.submittedBy?.name || 'Club Executive'}</span>
                                  )}
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

                                <td className="py-3 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => openExpenseHistory(ex)}
                                    className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 underline cursor-pointer"
                                  >
                                    History
                                  </button>
                                </td>

                                {isCore && (
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    {!ex.isVoided ? (
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => openEditExpenseModal(ex)}
                                          className="px-2 py-1 rounded-lg border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700 text-[11px] font-bold transition shadow-2xs cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setVoidingExpense(ex);
                                            setVoidReason('');
                                            setVoidError(null);
                                          }}
                                          className="px-2 py-1 rounded-lg border border-rose-300 hover:bg-rose-50 text-rose-700 text-[11px] font-bold transition shadow-2xs cursor-pointer"
                                        >
                                          Void
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-semibold italic">Voided</span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* EVENT EXPENSES PANEL (CLICKING AN EVENT ROW) */}
      {currentPanelEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 text-slate-900 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
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

            {currentPanelEvent.expenses.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No expenses recorded for this event. Use &quot;Add Expense&quot; to submit receipts.
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
                      {isCore && <th className="py-2.5 px-3 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentPanelEvent.expenses.map((ex: any) => {
                      const catInfo = CATEGORY_COLORS[ex.category] || { label: ex.category };

                      return (
                        <tr
                          key={ex.id}
                          className={`hover:bg-slate-50/80 transition ${
                            ex.isVoided ? 'bg-rose-50/40 opacity-75' : ''
                          }`}
                        >
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

                          <td className="py-3 px-3 text-slate-800 font-medium max-w-xs">
                            <div className="truncate">{ex.description || '—'}</div>
                            {ex.isVoided && (
                              <span className="text-[10px] text-rose-700 italic">
                                [Voided: {ex.voidReason}]
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                            {ex.isVoided ? (
                              <span className="line-through text-slate-400">
                                ₹{Math.round(Number(ex.amount)).toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span>₹{Math.round(Number(ex.amount)).toLocaleString('en-IN')}</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-slate-600 text-[11px]">
                            {ex.onBehalfOfClub ? (
                              <span className="font-semibold text-indigo-700">
                                Core for {ex.onBehalfOfClub}
                              </span>
                            ) : (
                              <span>{ex.addedByName || ex.submittedBy?.name || 'Club Executive'}</span>
                            )}
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

                          {isCore && (
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {!ex.isVoided ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditExpenseModal(ex)}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVoidingExpense(ex);
                                      setVoidReason('');
                                      setVoidError(null);
                                    }}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                                  >
                                    Void
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Voided</span>
                              )}
                            </td>
                          )}
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

      {/* EDIT CLUB BUDGET ALLOCATION MODAL (CORE ONLY WITH CONFIRMATION) */}
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
                onClick={() => {
                  setEditingClub(null);
                  setConfirmClubBudgetPrompt(false);
                }}
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

            {!confirmClubBudgetPrompt ? (
              <div className="space-y-4">
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
                    type="button"
                    onClick={() => {
                      if (!budgetReason.trim()) {
                        setEditBudgetError('A justification reason is required.');
                        return;
                      }
                      setConfirmClubBudgetPrompt(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            ) : (
              /* Confirmation Dialog */
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs space-y-2">
                  <div className="font-bold text-sm text-amber-900">Confirm Budget Allocation Update</div>
                  <p>
                    Are you sure you want to update <strong>{editingClub.name}</strong>&apos;s budget from{' '}
                    <strong>₹{editingClub.currentAllocated.toLocaleString('en-IN')}</strong> to{' '}
                    <strong>₹{Math.round(Number(newBudgetAmount)).toLocaleString('en-IN')}</strong>?
                  </p>
                  <p className="text-[11px] text-amber-800 italic">
                    Reason: &quot;{budgetReason.trim()}&quot;
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmClubBudgetPrompt(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    disabled={savingBudget}
                    onClick={handleSaveClubBudget}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {savingBudget ? 'Saving...' : 'Yes, Confirm Allocation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT EVENT APPROVED BUDGET MODAL (CORE ONLY WITH CONFIRMATION) */}
      {editingEventBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl relative space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Event Approved Budget</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update approved ceiling for <strong>{editingEventBudget.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingEventBudget(null);
                  setConfirmEventBudgetPrompt(false);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {eventBudgetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {eventBudgetError}
              </div>
            )}

            {!confirmEventBudgetPrompt ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Approved Event Budget (₹) <span className="text-rose-500">*</span>
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
                      value={newEventBudgetAmount}
                      onChange={(e) => setNewEventBudgetAmount(e.target.value)}
                      placeholder="15000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingEventBudget(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmEventBudgetPrompt(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            ) : (
              /* Confirmation Dialog */
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs space-y-2">
                  <div className="font-bold text-sm text-amber-900">Confirm Event Budget Update</div>
                  <p>
                    Are you sure you want to adjust the approved budget for{' '}
                    <strong>{editingEventBudget.title}</strong> from{' '}
                    <strong>₹{editingEventBudget.currentBudget.toLocaleString('en-IN')}</strong> to{' '}
                    <strong>₹{Math.round(Number(newEventBudgetAmount)).toLocaleString('en-IN')}</strong>?
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmEventBudgetPrompt(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    disabled={savingEventBudget}
                    onClick={handleSaveEventBudget}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {savingEventBudget ? 'Saving...' : 'Yes, Confirm Event Budget'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT EXPENSE MODAL (CORE ONLY WITH LIVE DATE WARNING & CONFIRMATION) */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-slate-900 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Expense Record</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Core audit modification for expense #{editingExpense.id.slice(0, 8)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingExpense(null);
                  setConfirmExpenseEditPrompt(false);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {editExpError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {editExpError}
              </div>
            )}

            {/* Check date boundary vs semester */}
            {(() => {
              if (!clubDetail || !editExpDate) return null;
              const expD = new Date(editExpDate);
              if (isNaN(expD.getTime())) return null;
              const sStart = new Date(clubDetail.semester.startDate);
              const sEnd = new Date(clubDetail.semester.endDate);
              sEnd.setHours(23, 59, 59, 999);
              if (expD < sStart || expD > sEnd) {
                return (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                    <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Warning: Selected date ({editExpDate}) is outside {clubDetail.semester.name}. This will be flagged in Needs Attention.
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {!confirmExpenseEditPrompt ? (
              <div className="space-y-3.5">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editExpAmount}
                    onChange={(e) => setEditExpAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editExpCategory}
                    onChange={(e) => setEditExpCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {Object.values(ExpenseCategory).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Expense Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editExpDate}
                    onChange={(e) => setEditExpDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    required
                    value={editExpDescription}
                    onChange={(e) => setEditExpDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Event dropdown (within same club) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Linked Event (within {clubDetail?.club?.name})
                  </label>
                  <select
                    value={editExpEventId}
                    onChange={(e) => setEditExpEventId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">Select event...</option>
                    {(clubDetail?.perEventRows || []).map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} (Budget: ₹{ev.budget.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Receipt URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Receipt URL / Link</label>
                  <input
                    type="url"
                    value={editExpReceiptUrl}
                    onChange={(e) => setEditExpReceiptUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Required Reason */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reason for Edit <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={editExpReason}
                    onChange={(e) => setEditExpReason(e.target.value)}
                    placeholder="e.g. Corrected invoice amount after GST verification"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingExpense(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editExpReason.trim()) {
                        setEditExpError('A reason is strictly required to edit an expense.');
                        return;
                      }
                      setConfirmExpenseEditPrompt(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    Review & Confirm →
                  </button>
                </div>
              </div>
            ) : (
              /* Confirmation Dialog for Edit */
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs space-y-2">
                  <div className="font-bold text-sm text-amber-900">Confirm Expense Modifications</div>
                  <p>
                    Are you sure you want to update this expense record? This action will write a permanent audit entry to the expense change log.
                  </p>
                  <p className="text-[11px] text-amber-800 italic">
                    Reason: &quot;{editExpReason.trim()}&quot;
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmExpenseEditPrompt(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                  >
                    ← Back to Edit
                  </button>
                  <button
                    type="button"
                    disabled={savingExpenseEdit}
                    onClick={handleSaveExpenseEdit}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {savingExpenseEdit ? 'Saving...' : 'Yes, Confirm Expense Edit'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VOID EXPENSE CONFIRMATION MODAL (CORE ONLY WITH MANDATORY REASON) */}
      {voidingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl relative space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
                  <AlertTriangleIcon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Void Expense Record</h3>
                  <p className="text-xs text-slate-500">Soft-delete expense with audit justification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoidingExpense(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {voidError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {voidError}
              </div>
            )}

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-slate-900">
                ₹{Math.round(Number(voidingExpense.amount)).toLocaleString('en-IN')} • {voidingExpense.category}
              </div>
              <div className="text-slate-600 truncate">{voidingExpense.description || 'No description'}</div>
              <div className="text-[11px] text-slate-400">
                Date: {new Date(voidingExpense.expenseDate).toLocaleDateString('en-IN')}
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Voided expenses are immediately removed from all semester spend calculations, charts, and balances. They will remain visible behind the &quot;Show voided&quot; toggle in the ledger for transparency.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Voiding <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Duplicate entry submitted by vendor / payment cancelled"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidingExpense(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isVoiding}
                onClick={handleVoidExpense}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {isVoiding ? 'Voiding...' : 'Confirm Void Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPENSE AUDIT HISTORY MODAL */}
      {historyExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-slate-900 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Expense Audit History</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audit timeline for expense #{historyExpense.id.slice(0, 8)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryExpense(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                Loading audit trail...
              </div>
            ) : expenseHistoryRecords.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                No edit history logged for this expense.
              </div>
            ) : (
              <div className="space-y-3">
                {expenseHistoryRecords.map((log) => {
                  const badgeColor =
                    log.action === 'CREATED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : log.action === 'VOIDED'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-indigo-50 text-indigo-800 border-indigo-200';

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-md border font-black text-[10px] ${badgeColor}`}>
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(log.timestamp || log.createdAt).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="text-slate-700 font-medium">
                        Performed by: <strong>{log.performedBy}</strong>
                        {log.onBehalfOfClub && (
                          <span className="text-indigo-600 font-semibold ml-1">
                            (on behalf of {log.onBehalfOfClub})
                          </span>
                        )}
                      </div>

                      <div className="text-slate-600 italic bg-white p-2 rounded-xl border border-slate-200">
                        &quot;{log.reason}&quot;
                      </div>

                      {log.newValues && log.action === 'EDITED' && (
                        <div className="text-[10px] text-slate-500 font-mono bg-slate-100 p-2 rounded-xl">
                          New values: {JSON.stringify(log.newValues)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryExpense(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition"
              >
                Close History
              </button>
            </div>
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
        approvedEvents={addExpenseApprovedEvents}
        currentTotalSpent={clubDetail?.spent || allClubsData?.totalSpent || 0}
      />
    </div>
  );
}
