'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarIcon,
  RupeeIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  TrendingUpIcon,
} from './Icons';
import { CATEGORY_COLORS, getClubTheme } from '@/lib/colors';
import { UserRole } from '@/lib/constants';

interface HistoryViewProps {
  currentRole: string;
  currentUser?: any;
}

export default function HistoryView({ currentRole, currentUser }: HistoryViewProps) {
  const [semesters, setSemesters] = useState<any[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('budget-fall-2026');
  const [selectedSemester, setSelectedSemester] = useState<any>(null);
  const [previousSemester, setPreviousSemester] = useState<any>(null);

  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [spendingPatterns, setSpendingPatterns] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter for Section 1: Past Events
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState('ALL');

  // Handover notes editing state (eventId -> text)
  const [handoverNotes, setHandoverNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});
  const [savedSuccess, setSavedSuccess] = useState<Record<string, boolean>>({});

  const isCore = currentRole === UserRole.CORE_VERIFIER || currentRole === 'ACM_CORE';
  const isExec = currentRole === UserRole.CLUB_EXEC;
  const canEditHandover = isCore || isExec; // Editable by Executives and Core, read-only for members

  const fetchHistory = async (semesterId?: string) => {
    setLoading(true);
    try {
      const url = semesterId
        ? `/api/history?semester=${encodeURIComponent(semesterId)}`
        : '/api/history';
      const res = await fetch(url);
      const json = await res.json();

      if (json.success && json.data) {
        const data = json.data;
        setSemesters(data.semesters || []);
        setSelectedSemester(data.selectedSemester);
        setPreviousSemester(data.previousSemester);
        if (data.selectedSemester) {
          setSelectedSemesterId(data.selectedSemester.id);
        }
        setPastEvents(data.pastEvents || []);
        setConflicts(data.conflicts || []);
        setSpendingPatterns(data.spendingPatterns);

        // Populate handover notes draft state
        const notesMap: Record<string, string> = {};
        for (const ev of data.pastEvents || []) {
          notesMap[ev.id] = ev.lessonsLearned || '';
        }
        setHandoverNotes(notesMap);
      }
    } catch (err) {
      console.error('Failed to load history data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentRole]);

  const handleSemesterChange = (newSemesterId: string) => {
    setSelectedSemesterId(newSemesterId);
    fetchHistory(newSemesterId);
  };

  // Section 1: Filtered Past Events
  const filteredPastEvents = useMemo(() => {
    return pastEvents.filter((ev) => {
      const matchesClub =
        selectedClub === 'ALL' ||
        ev.clubName?.toLowerCase() === selectedClub.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        ev.title?.toLowerCase().includes(q) ||
        ev.organizer?.toLowerCase().includes(q) ||
        ev.venue?.toLowerCase().includes(q) ||
        ev.reviewComment?.toLowerCase().includes(q) ||
        ev.eventType?.toLowerCase().includes(q);

      return matchesClub && matchesQuery;
    });
  }, [pastEvents, selectedClub, searchQuery]);

  // Unique clubs list from past events
  const clubList = useMemo(() => {
    const set = new Set<string>();
    for (const ev of pastEvents) {
      if (ev.clubName) set.add(ev.clubName);
    }
    return Array.from(set);
  }, [pastEvents]);

  // Section 4: Save Handover Notes
  const handleSaveNotes = async (eventId: string) => {
    if (!canEditHandover) return;

    setSavingNotes((prev) => ({ ...prev, [eventId]: true }));
    try {
      const notes = handoverNotes[eventId] || '';
      const res = await fetch(`/api/events/${eventId}/handover`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({
          lessonsLearned: notes,
          userRole: currentRole,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSavedSuccess((prev) => ({ ...prev, [eventId]: true }));
        setTimeout(() => {
          setSavedSuccess((prev) => ({ ...prev, [eventId]: false }));
        }, 2500);
      } else {
        alert(json.error?.message || json.error || 'Failed to save notes');
      }
    } catch (err: any) {
      console.error('Error saving handover notes:', err);
      alert('Network error saving notes.');
    } finally {
      setSavingNotes((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & SEMESTER FILTER */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Institutional Semester History & Knowledge Handover
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Historical event outcomes, conflict resolutions, comparative spending patterns, and executive transition notes.
          </p>
        </div>

        {/* Semester Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">
            Semester:
          </label>
          <div className="relative">
            <select
              value={selectedSemesterId}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 font-bold text-xs py-2 px-3.5 pr-8 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs transition"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div
            className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border shrink-0 ${
              canEditHandover
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            {canEditHandover ? '✍️ Exec & Core Editor' : '🔒 Read-Only Member'}
          </div>
        </div>
      </div>

      {/* 2. SECTION 1: PAST EVENTS TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <span>Past Events ({selectedSemester?.name || 'Selected Semester'})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Completed campus club programs, execution logs, and event cost accounting
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past events, organizer..."
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-48 sm:w-56"
            />

            {/* Club Filter */}
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Clubs</option>
              {clubList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredPastEvents.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs italic">
            No past events recorded for this semester matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-bold">Event & Club</th>
                  <th className="pb-3 font-bold">Organizer</th>
                  <th className="pb-3 font-bold">Date & Venue</th>
                  <th className="pb-3 font-bold">Type</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold">Approval Comment</th>
                  <th className="pb-3 font-bold text-right">Actual Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPastEvents.map((ev) => {
                  const clubTheme = getClubTheme(ev.clubName);
                  const actualSpend = parseFloat(ev.actualSpend) || 0;

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/70 transition">
                      {/* Event & Club */}
                      <td className="py-3.5 pr-3">
                        <div className="font-bold text-slate-900 text-xs">{ev.title}</div>
                        <div className={`text-[11px] font-semibold ${clubTheme.text}`}>
                          {ev.clubName || 'General Campus'}
                        </div>
                      </td>

                      {/* Organizer */}
                      <td className="py-3.5 pr-3 whitespace-nowrap text-slate-700 font-medium">
                        {ev.organizer || ev.submitterName || 'Club Lead'}
                      </td>

                      {/* Date & Venue */}
                      <td className="py-3.5 pr-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {new Date(ev.startTime).toLocaleDateString([], { dateStyle: 'medium' })}
                        </div>
                        <div className="text-[11px] text-slate-500">{ev.venue}</div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 pr-3 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
                          {ev.eventType || ev.category || 'Workshop'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 pr-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            ev.status === 'COMPLETED' || ev.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : ev.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </td>

                      {/* Approval Comment */}
                      <td className="py-3.5 pr-3 max-w-[220px]">
                        <p className="line-clamp-2 text-slate-600 text-[11px]" title={ev.reviewComment || ''}>
                          {ev.reviewComment ? `"${ev.reviewComment}"` : '—'}
                        </p>
                      </td>

                      {/* Actual Spend */}
                      <td className="py-3.5 text-right font-black text-slate-900 whitespace-nowrap">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                          ₹{actualSpend.toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. SECTION 2: CONFLICT LOG */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-amber-500" />
              <span>Conflict Log ({selectedSemester?.name})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete audit trail of flagged schedule clashes, venue contentions, and executive determinations
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
            {conflicts.length} Flagged Incident{conflicts.length === 1 ? '' : 's'}
          </div>
        </div>

        {conflicts.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs italic">
            No scheduling or venue conflicts were flagged during this semester.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {conflicts.map((c) => {
              const isVenue = c.conflictType === 'venue';
              const isApproved = c.resolution.toLowerCase().includes('approved');
              const isRejected = c.resolution.toLowerCase().includes('rejected');
              const isRescheduled = c.resolution.toLowerCase().includes('rescheduled');

              return (
                <div key={c.id} className="py-4 space-y-2 hover:bg-slate-50/50 p-3 rounded-xl transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Events Involved */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900">
                        {c.event?.title || 'Event 1'}
                      </span>
                      <span className="text-slate-400 text-xs font-bold">⚡ vs ⚡</span>
                      <span className="text-xs font-black text-slate-900">
                        {c.conflictingEvent?.title || 'Event 2'}
                      </span>

                      {/* Type Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isVenue
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {isVenue ? '📍 Venue Conflict' : '👥 Audience Conflict'}
                      </span>
                    </div>

                    {/* Date Flagged */}
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      Flagged: {new Date(c.dateFlagged).toLocaleDateString([], { dateStyle: 'medium' })}
                    </span>
                  </div>

                  {/* Core Resolution Details */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-semibold text-[11px]">How Core resolved it:</span>
                        <span
                          className={`font-black text-[11px] px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : isRescheduled
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {c.resolution}
                        </span>
                      </div>
                      <p className="text-slate-700 italic text-[11px]">"{c.comment}"</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block font-medium">Reviewer</span>
                      <span className="text-xs font-bold text-slate-800">{c.reviewer}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. SECTION 3: SPENDING PATTERNS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUpIcon className="w-4 h-4 text-cyan-600" />
              <span>Spending Patterns & Comparative Analysis</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Category disbursements compared with previous semester, high-expenditure initiatives, and cost efficiency
            </p>
          </div>

          {previousSemester && (
            <div className="text-xs bg-cyan-50 border border-cyan-200 text-cyan-900 font-bold px-3 py-1 rounded-xl">
              Comparing: {selectedSemester?.name} vs {previousSemester.name}
            </div>
          )}
        </div>

        {/* 1. Category-wise Spending & Previous Semester Comparison */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
            Total Spent per Category ({selectedSemester?.name})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(spendingPatterns?.categoryBreakdown || {}).map(([cat, amount]: [string, any]) => {
              const catColor = CATEGORY_COLORS[cat] || { label: cat, hex: '#6366f1' };
              const currentSpend = Number(amount) || 0;
              const prevSpend = spendingPatterns?.prevCategoryBreakdown
                ? Number(spendingPatterns.prevCategoryBreakdown[cat]) || 0
                : null;

              let diffPercent: number | null = null;
              if (prevSpend !== null && prevSpend > 0) {
                diffPercent = Math.round(((currentSpend - prevSpend) / prevSpend) * 100);
              }

              return (
                <div
                  key={cat}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${catColor.hex}18`, color: catColor.hex }}
                    >
                      {catColor.label}
                    </span>
                    {diffPercent !== null && (
                      <span
                        className={`text-[10px] font-extrabold ${
                          diffPercent > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {diffPercent > 0 ? `+${diffPercent}%` : `${diffPercent}%`}
                      </span>
                    )}
                  </div>

                  <div className="text-lg font-black text-slate-900">
                    ₹{currentSpend.toLocaleString('en-IN')}
                  </div>

                  {prevSpend !== null && (
                    <div className="text-[10px] text-slate-400">
                      vs ₹{prevSpend.toLocaleString('en-IN')} ({previousSemester?.name})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Top 5 Most Expensive Events & Average Cost per Event Type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Top 5 Most Expensive Events */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
              <span>Top 5 Most Expensive Events</span>
              <span className="text-[11px] font-semibold text-slate-400">By Actual Disbursement</span>
            </h4>

            {(!spendingPatterns?.top5Events || spendingPatterns.top5Events.length === 0) ? (
              <p className="text-xs text-slate-400 italic py-4">No events logged for this semester.</p>
            ) : (
              <div className="space-y-2">
                {spendingPatterns.top5Events.map((ev: any, index: number) => {
                  const spend = parseFloat(ev.actualSpend) || 0;
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                          #{index + 1}
                        </span>
                        <div>
                          <div className="font-bold text-xs text-slate-900 max-w-[200px] sm:max-w-xs truncate">
                            {ev.title}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {ev.clubName} • {ev.eventType || 'Event'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                          ₹{spend.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Average Cost per Event Type */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
              <span>Average Cost per Event Type</span>
              <span className="text-[11px] font-semibold text-slate-400">Total Spent ÷ Event Count</span>
            </h4>

            {(!spendingPatterns?.avgCostPerType || spendingPatterns.avgCostPerType.length === 0) ? (
              <p className="text-xs text-slate-400 italic py-4">No event categories recorded.</p>
            ) : (
              <div className="space-y-2">
                {spendingPatterns.avgCostPerType.map((st: any) => {
                  const avg = parseFloat(st.avgCost) || 0;
                  const total = parseFloat(st.totalSpent) || 0;

                  return (
                    <div
                      key={st.eventType}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">{st.eventType}</div>
                        <div className="text-[10px] text-slate-500">
                          {st.eventCount} event{st.eventCount === 1 ? '' : 's'} • ₹{total.toLocaleString('en-IN')} total
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-xs text-slate-800">
                          ₹{avg.toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">avg</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. SECTION 4: HANDOVER NOTES (Editable 'Lessons learned' per completed event) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-purple-600" />
              <span>Executive Handover Notes & Lessons Learned</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Knowledge retention per completed event for seamless leadership transition (editable by Executives & Core)
            </p>
          </div>

          <div
            className={`text-xs font-semibold px-3 py-1 rounded-xl border ${
              canEditHandover
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            {canEditHandover ? 'Editable by Executives and Core' : 'Read-Only Member View'}
          </div>
        </div>

        {pastEvents.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs italic">
            No completed events available for handover notes in this semester.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastEvents.map((ev) => {
              const notes = handoverNotes[ev.id] ?? (ev.lessonsLearned || '');
              const isSaving = savingNotes[ev.id];
              const isSuccess = savedSuccess[ev.id];

              return (
                <div
                  key={ev.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{ev.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {ev.eventType || 'Event'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-700">{ev.clubName}</span>
                      <span>•</span>
                      <span>Lead: {ev.organizer || ev.submitterName}</span>
                      <span>•</span>
                      <span>{new Date(ev.startTime).toLocaleDateString([], { dateStyle: 'short' })}</span>
                    </div>
                  </div>

                  {/* Lessons Learned Text Area */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Lessons Learned & Recommendations:
                    </label>

                    {canEditHandover ? (
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) =>
                          setHandoverNotes((prev) => ({
                            ...prev,
                            [ev.id]: e.target.value,
                          }))
                        }
                        placeholder="Document vendor notes, unexpected costs, equipment hurdles, attendance takeaways for next year's executive team..."
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-normal leading-relaxed"
                      />
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 min-h-[70px] leading-relaxed italic">
                        {notes ? `"${notes}"` : 'No lessons learned recorded yet for this event.'}
                      </div>
                    )}
                  </div>

                  {/* Action / Save Button */}
                  {canEditHandover && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        {isSuccess ? '✓ Saved to database' : 'Saved per event'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSaveNotes(ev.id)}
                        disabled={isSaving}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer ${
                          isSuccess
                            ? 'bg-emerald-600 text-white'
                            : 'btn-primary-gradient text-white hover:opacity-95'
                        }`}
                      >
                        {isSaving ? 'Saving...' : isSuccess ? '✓ Saved' : 'Save Notes'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
