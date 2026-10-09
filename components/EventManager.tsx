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

export default function EventManager({ currentRole }: { currentRole: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View state: 'calendar' | 'timeline' | 'clashes' | 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline' | 'clashes' | 'list'>('calendar');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerInitialDate, setDrawerInitialDate] = useState<string | undefined>();

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
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
      if (json.success && json.clubs) {
        setClubs(json.clubs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchClubs();
  }, []);

  const handleUpdateStatus = async (eventId: string, newStatus: string) => {
    if (currentRole !== 'ACM_CORE') return;

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, userRole: currentRole }),
      });
      const data = await res.json();
      if (data.success) {
        fetchEvents();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchesStatus = filterStatus === 'ALL' || ev.status === filterStatus;
    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.club?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const conflictCount = events.filter((e) => e.status === 'FLAGGED_CONFLICT').length;
  const approvedCount = events.filter((e) => e.status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      {/* 1. Slim Top Bar: KPI Chips & Primary "+ New Event" Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-md shadow-lg">
        {/* Slim KPI Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <span className="text-blue-400 font-bold">📅</span>
            <span>{events.length} Total Events</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{approvedCount} Approved</span>
          </div>

          <button
            type="button"
            onClick={() => setViewMode('clashes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
              conflictCount > 0
                ? 'bg-red-950/60 border-red-500/60 text-red-300 hover:bg-red-900/70 animate-pulse'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <AlertTriangleIcon className="w-3.5 h-3.5 text-red-400" />
            <span className="font-bold">{conflictCount} Clashes</span>
          </button>
        </div>

        {/* Action Controls & New Event Button */}
        <div className="flex items-center gap-3">
          {/* View Mode Switcher Pills */}
          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'calendar' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              📅 Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'timeline' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              📊 Venue Timeline
            </button>
            <button
              type="button"
              onClick={() => setViewMode('clashes')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'clashes' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚠️ Clashes ({conflictCount})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cards
            </button>
          </div>

          {/* Hero "+ New Event" Button (Opens Slide-Over Drawer) */}
          {currentRole !== 'MEMBER' && (
            <button
              type="button"
              onClick={() => {
                setDrawerInitialDate(undefined);
                setIsDrawerOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/25 transition shrink-0"
            >
              <PlusCircleIcon className="w-4 h-4" />
              <span>+ New Event</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Search & Filter Bar (Only shown on Calendar & Cards views) */}
      {(viewMode === 'calendar' || viewMode === 'list') && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl backdrop-blur-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by title, venue, or club..."
            className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-80"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved Only</option>
            <option value="FLAGGED_CONFLICT">Conflicts Only</option>
            <option value="PENDING">Pending Only</option>
          </select>
        </div>
      )}

      {/* 3. HERO CONTENT VIEW */}
      {viewMode === 'calendar' && (
        <CalendarView events={filteredEvents} />
      )}

      {viewMode === 'timeline' && (
        <VenueTimeline events={events} />
      )}

      {viewMode === 'clashes' && (
        <ClashesPanel
          events={events}
          currentRole={currentRole}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {viewMode === 'list' && (
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-md text-white">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs italic">
              No campus events match your query.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((ev) => {
                const isConflict = ev.status === 'FLAGGED_CONFLICT';
                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 ${
                      isConflict
                        ? 'bg-red-950/30 border-red-800/80 hover:border-red-600 shadow-sm shadow-red-900/20'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{ev.title}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              isConflict
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : ev.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </div>
                        <span className="text-xs text-blue-400 font-semibold mt-0.5 block">{ev.club?.name}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-900 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ev.venue}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(ev.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ev.audienceType} ({ev.expectedAudience} cap)</span>
                      </div>
                    </div>

                    {currentRole === 'ACM_CORE' && ev.status !== 'APPROVED' && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800">
                        <span className="text-[11px] text-slate-400 font-semibold">Core Verification:</span>
                        <button
                          onClick={() => handleUpdateStatus(ev.id, 'APPROVED')}
                          className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-semibold transition shadow-sm"
                        >
                          ✓ {ev.status === 'FLAGGED_CONFLICT' ? 'Override & Approve' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(ev.id, 'REJECTED')}
                          className="px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-xs font-semibold transition shadow-sm"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. SLIDE-OVER EVENT PROPOSAL DRAWER */}
      <EventDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        clubs={clubs}
        currentRole={currentRole}
        onEventCreated={fetchEvents}
        initialDate={drawerInitialDate}
      />
    </div>
  );
}
