'use client';

import React, { useEffect, useState } from 'react';
import { AuthUser } from './Navbar';
import {
  CalendarIcon,
  RupeeIcon,
  AlertTriangleIcon,
  ClockIcon,
  TrendingUpIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from './Icons';
import { UserRole, CAMPUS_CLUBS } from '@/lib/constants';

interface DashboardViewProps {
  currentUser: AuthUser | null;
  onNavigateTab: (tab: 'events' | 'expenses' | 'history', viewMode?: string, eventId?: string) => void;
}

export default function DashboardView({ currentUser, onNavigateTab }: DashboardViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.data) {
          setData(json.data);
        }
      })
      .catch((err) => console.error('Failed to load dashboard data:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const formatCurrency = (amt: number) => {
    return `₹${Math.round(amt).toLocaleString('en-IN')}`;
  };

  const formatEventDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-2xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs" />
          <div className="h-72 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs" />
        </div>
      </div>
    );
  }

  const cards = data?.mainCards || {
    upcomingEventsCount: 0,
    pendingEventsCount: 0,
    potentialConflictsCount: 0,
    totalSpending: 0,
    remainingBudget: 50000,
    percentSpent: 0,
  };

  const upcomingEvents = data?.upcomingEvents || [];
  const conflictAlerts = data?.conflictAlerts || [];
  const budgetSummary = data?.budgetSummary || {
    budgetName: 'Fall 2026 Semester Budget',
    totalAllocated: 50000,
    totalSpent: 0,
    remainingBudget: 50000,
    percentSpent: 0,
  };
  const categorySpending = data?.categorySpending || {};

  const userName = currentUser?.name?.split(' ')[0] || 'Member';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-indigo-700 border border-violet-200 mb-2">
            <span>✨</span>
            <span>SVNIT Campus Manager • Live Overview</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Welcome back, {userName} 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time conflict-aware events schedule and institutional fund tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 relative z-10 shrink-0">
          <button
            onClick={() => onNavigateTab('events', 'calendar')}
            className="btn-primary-gradient px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Open Calendar</span>
          </button>
          {currentUser && currentUser.role !== UserRole.MEMBER && (
            <button
              onClick={() => onNavigateTab('expenses')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <RupeeIcon className="w-3.5 h-3.5" />
              <span>Budget Overview</span>
            </button>
          )}
        </div>

        {/* Ambient decorative gradient corner */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/10 via-cyan-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* ── Active Conflicts Alert Banner ── */}
      {conflictAlerts.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  {conflictAlerts.length} Active Venue / Audience Conflict{conflictAlerts.length > 1 ? 's' : ''} Flagged
                </h3>
                <p className="text-xs text-amber-700">
                  Automated conflict detection has flagged simultaneous campus bookings requiring review.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('events', 'clashes')}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition shrink-0 shadow-xs cursor-pointer"
            >
              Resolve Conflicts →
            </button>
          </div>

          <div className="space-y-2">
            {conflictAlerts.map((c: any) => (
              <div
                key={c.id}
                className="flex items-center justify-between bg-white border border-amber-200/80 rounded-xl px-3.5 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-slate-900 truncate">{c.event?.title || 'Event A'}</span>
                  <span className="text-slate-400 font-medium">clashes with</span>
                  <span className="font-bold text-slate-900 truncate">{c.conflictingEvent?.title || 'Event B'}</span>
                </div>
                <span className="text-[11px] font-bold text-amber-700 shrink-0 ml-2">
                  {c.reason || 'Overlapping Venue / Time'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4 KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Upcoming Events */}
        <div
          onClick={() => onNavigateTab('events', 'list')}
          className="bg-white border border-slate-200 hover:border-violet-300 rounded-2xl p-4 sm:p-5 shadow-xs transition hover:shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Upcoming Events
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {cards.upcomingEventsCount}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Approved & scheduled on campus
          </p>
        </div>

        {/* Stat 2: Pending Approvals */}
        <div
          onClick={() => onNavigateTab('events', 'reviews')}
          className="bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs transition hover:shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Approvals
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
              <ClockIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            <span>{cards.pendingEventsCount}</span>
            {cards.pendingEventsCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Action Req.
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Proposals awaiting review
          </p>
        </div>

        {/* Stat 3: Active Conflicts */}
        <div
          onClick={() => onNavigateTab('events', 'clashes')}
          className="bg-white border border-slate-200 hover:border-rose-300 rounded-2xl p-4 sm:p-5 shadow-xs transition hover:shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Conflicts
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-105 transition">
              <AlertTriangleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            <span>{cards.potentialConflictsCount}</span>
            {cards.potentialConflictsCount > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                Flagged
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                All Clear
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Overlapping times or venues
          </p>
        </div>

        {/* Stat 4: Remaining Budget */}
        <div
          onClick={() => {
            if (currentUser && currentUser.role !== UserRole.MEMBER) {
              onNavigateTab('expenses');
            }
          }}
          className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-xs transition hover:shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Remaining Budget
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
              <RupeeIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {formatCurrency(cards.remainingBudget)}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, cards.percentSpent))}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-500">
              {cards.percentSpent}% spent
            </span>
          </div>
        </div>
      </div>

      {/* ── Two-Column Main Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Upcoming Events Preview */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Upcoming Approved Events
              </h3>
              <p className="text-xs text-slate-500">
                Scheduled campus activities verified without clashes
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('events', 'calendar')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
            >
              Full Calendar →
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
              <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">No upcoming events scheduled</p>
              <p className="text-xs text-slate-400 mt-1">Submit a proposal to schedule your next club event</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingEvents.map((evt: any) => {
                const club = CAMPUS_CLUBS.find((c) => c.id === evt.clubId);
                return (
                  <div
                    key={evt.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl px-2.5 transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0 p-1">
                        {club?.logoUrl ? (
                          <img src={club.logoUrl} alt={club.shortName} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xs font-bold text-indigo-700">{club?.shortName || 'ACM'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{evt.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <ClockIcon className="w-3 h-3 text-slate-400" />
                            <span>{formatEventDate(evt.startTime)}</span>
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPinIcon className="w-3 h-3 text-slate-400" />
                            <span>{evt.venue}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✓ Approved
                      </span>
                      <button
                        onClick={() => onNavigateTab('events', 'timeline')}
                        className="text-xs text-slate-400 hover:text-slate-700 p-1"
                        title="View details"
                      >
                        →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (1 span): Budget & Spending Analytics */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Budget Health
                </h3>
                <p className="text-xs text-slate-500">{budgetSummary.budgetName}</p>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                Fall 2026
              </span>
            </div>

            {/* Total Allocated vs Spent */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-slate-500">Allocated Budget</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(budgetSummary.totalAllocated)}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-slate-500">Total Spent</span>
                <span className="text-sm font-bold text-rose-600">
                  {formatCurrency(budgetSummary.totalSpent)}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700">Available to Plan</span>
                <span className="text-sm font-extrabold text-emerald-600">
                  {formatCurrency(budgetSummary.remainingBudget)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="pt-1">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, budgetSummary.percentSpent))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                  <span>0%</span>
                  <span>{budgetSummary.percentSpent}% utilized</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Category Distribution */}
            {Object.keys(categorySpending).length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                  Category Breakdown
                </span>
                <div className="space-y-2">
                  {Object.entries(categorySpending).map(([category, amount]) => {
                    const num = Number(amount) || 0;
                    if (num === 0) return null;
                    const pct =
                      budgetSummary.totalSpent > 0
                        ? Math.round((num / budgetSummary.totalSpent) * 100)
                        : 0;
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 capitalize font-medium">{category.toLowerCase()}</span>
                          <span className="text-slate-900 font-bold">{formatCurrency(num)} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Shortcuts Card */}
          <div className="bg-gradient-to-br from-violet-50 to-cyan-50/50 border border-violet-100/80 rounded-2xl sm:rounded-3xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">
              ⚡ Quick Actions
            </h4>
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => onNavigateTab('events', 'calendar')}
                className="w-full text-left bg-white hover:bg-violet-100/50 border border-violet-200/60 rounded-xl px-3 py-2 text-indigo-900 font-semibold transition flex items-center justify-between cursor-pointer"
              >
                <span>📅 Schedule New Event</span>
                <span className="text-indigo-400">→</span>
              </button>
              <button
                onClick={() => onNavigateTab('events', 'clashes')}
                className="w-full text-left bg-white hover:bg-violet-100/50 border border-violet-200/60 rounded-xl px-3 py-2 text-indigo-900 font-semibold transition flex items-center justify-between cursor-pointer"
              >
                <span>⚠️ Inspect Venue Clashes</span>
                <span className="text-indigo-400">→</span>
              </button>
              <button
                onClick={() => onNavigateTab('history')}
                className="w-full text-left bg-white hover:bg-violet-100/50 border border-violet-200/60 rounded-xl px-3 py-2 text-indigo-900 font-semibold transition flex items-center justify-between cursor-pointer"
              >
                <span>📜 View Conflict Audit Log</span>
                <span className="text-indigo-400">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
