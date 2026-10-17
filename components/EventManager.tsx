'use client';

import React, { useState, useEffect } from 'react';
import CalendarView from './CalendarView';
import VenueTimeline from './VenueTimeline';
import ClashesPanel from './ClashesPanel';
import EventDrawer from './EventDrawer';
import {
  CalendarIcon,
  AlertTriangleIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  PlusCircleIcon,
} from './Icons';
import { getClubTheme } from '@/lib/colors';
import { UserRole } from '@/lib/constants';

export default function EventManager({
  currentRole,
  currentUser,
}: {
  currentRole: string;
  currentUser?: any;
}) {
  const [events, setEvents] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View state: 'calendar' | 'timeline' | 'clashes' | 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline' | 'clashes' | 'list'>('calendar');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerInitialDate, setDrawerInitialDate] = useState<string | undefined>();

  const isCoreVerifier = currentRole === UserRole.CORE_VERIFIER || currentRole === 'ACM_CORE';
  const isMember = currentRole === UserRole.MEMBER;

  const fetchEvents = async () => {
    try {
      const url = isMember ? `/api/events?userRole=${UserRole.MEMBER}` : '/api/events';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setEvents(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClubs = async () => {
    try {
      const res = await fetch('/api/clubs');
      const json = await res.json();
      if (json.success && (json.data || json.clubs)) {
        setClubs(json.data || json.clubs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConflicts = async () => {
    if (isMember) return;
    try {
      const res = await fetch('/api/conflicts');
      const json = await res.json();
      if (json.success && json.data) {
        setConflicts(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchClubs();
    if (!isMember) {
      fetchConflicts();
    }
  }, [currentRole]);

  const handleUpdateStatus = async (eventId: string, newStatus: string) => {
    if (!isCoreVerifier) return;

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, userRole: UserRole.CORE_VERIFIER }),
      });
      const data = await res.json();
      if (data.success) {
        fetchEvents();
        fetchConflicts();
      } else {
        alert(data.error?.message || data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveConflict = async (conflictId: string, status: string, note?: string) => {
    if (!isCoreVerifier) return;

    try {
      const res = await fetch(`/api/conflicts/${conflictId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          resolutionNote: note || 'Resolved by ACM Core Verifier.',
          userRole: UserRole.CORE_VERIFIER,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchConflicts();
        fetchEvents();
      } else {
        alert(data.error?.message || data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // For public users / students, ALWAYS strictly show only APPROVED events!
  // If an event is rejected or pending, it is automatically omitted from public view.
  const visibleEvents = isMember
    ? events.filter((ev) => ev.status === 'APPROVED')
    : events;

  const filteredEvents = visibleEvents.filter((ev) => {
    const matchesStatus = filterStatus === 'ALL' || ev.status === filterStatus;
    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.club?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const conflictCount = conflicts.filter((c) => c.status === 'FLAGGED').length;
  const approvedCount = events.filter((e) => e.status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      {/* 1. Slim Top Bar: KPI Chips & Primary Action with Violet-to-Cyan Gradient */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        {/* Slim KPI Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            <span className="text-indigo-600 font-bold">📅</span>
            <span>{visibleEvents.length} {isMember ? 'Approved Events' : 'Events'}</span>
          </div>

          {!isMember && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>{approvedCount} Approved</span>
            </div>
          )}

          {!isMember && (
            <button
              type="button"
              onClick={() => setViewMode('clashes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
                conflictCount > 0
                  ? 'bg-rose-50 border-rose-200 text-rose-800 animate-pulse font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <AlertTriangleIcon className="w-3.5 h-3.5 text-rose-600" />
              <span>{conflictCount} Clashes</span>
            </button>
          )}
        </div>

        {/* View Mode Switcher & + New Event Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pt-1 sm:pt-0">
          {/* View Mode Switcher Pills */}
          <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                viewMode === 'calendar' ? 'tab-active-gradient' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              📅 Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                viewMode === 'timeline' ? 'tab-active-gradient' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              📊 Timeline
            </button>
            {!isMember && (
              <button
                type="button"
                onClick={() => setViewMode('clashes')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'clashes' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                ⚠️ Clashes ({conflictCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'tab-active-gradient' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              Cards
            </button>
          </div>

          {/* Hero "+ New Event" Button with Violet-to-Cyan Gradient */}
          {!isMember && (
            <button
              type="button"
              onClick={() => {
                setDrawerInitialDate(undefined);
                setIsDrawerOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 btn-primary-gradient text-white text-xs font-bold rounded-xl shadow-md transition shrink-0"
            >
              <PlusCircleIcon className="w-4 h-4" />
              <span>+ New</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      {(viewMode === 'calendar' || viewMode === 'list') && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by title, venue, or club..."
            className="bg-slate-50 border border-slate-300 text-xs rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full sm:w-80"
          />

          {!isMember ? (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-xs rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved Only</option>
              <option value="PENDING">Pending Only</option>
              <option value="REJECTED">Rejected Only</option>
              <option value="COMPLETED">Completed Only</option>
            </select>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>Official Approved Campus Events</span>
            </div>
          )}
        </div>
      )}

      {/* 3. HERO CONTENT VIEW */}
      {viewMode === 'calendar' && (
        <CalendarView events={filteredEvents} isMember={isMember} />
      )}

      {viewMode === 'timeline' && (
        <VenueTimeline events={visibleEvents} />
      )}

      {viewMode === 'clashes' && (
        <ClashesPanel
          conflicts={conflicts}
          isCoreVerifier={isCoreVerifier}
          onResolve={handleResolveConflict}
        />
      )}

      {viewMode === 'list' && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-900">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              No campus events match your query.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((ev) => {
                const clubTheme = getClubTheme(ev.club?.name);

                return (
                  <div
                    key={ev.id}
                    className="p-4 rounded-2xl border transition-all duration-200 bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{ev.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {ev.eventType || ev.category || 'Workshop'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              ev.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : ev.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className={`text-xs font-semibold ${clubTheme.text}`}>{ev.club?.name}</p>
                          {ev.organizer && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              • Lead: {ev.organizer}
                            </span>
                          )}
                        </div>
                      </div>

                      {isCoreVerifier && (
                        <div className="flex items-center gap-2">
                          {ev.status !== 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(ev.id, 'APPROVED')}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                            >
                              Approve
                            </button>
                          )}
                          {ev.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(ev.id, 'REJECTED')}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                      {ev.description || 'No description provided.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      {/* Estimated Cost Display */}
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-xs">
                        <span>₹{Number(ev.estimatedCost ?? 0).toLocaleString()} est.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">{ev.venue}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(ev.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ev.audienceTags?.join(', ') || 'General Students'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Slide-Over Drawer for New Event Proposals */}
      <EventDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        clubs={clubs}
        currentRole={currentRole}
        currentUser={currentUser}
        onEventCreated={() => {
          fetchEvents();
          fetchConflicts();
        }}
        initialDate={drawerInitialDate}
      />
    </div>
  );
}
