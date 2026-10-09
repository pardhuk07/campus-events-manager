'use client';

import React, { useState, useEffect } from 'react';
import CalendarView from './CalendarView';
import {
  CalendarIcon,
  AlertTriangleIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
} from './Icons';

export default function EventManager({ currentRole }: { currentRole: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View state & search filters
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('Seminar Hall 1');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [audienceType, setAudienceType] = useState('TECH_UG');
  const [expectedAudience, setExpectedAudience] = useState(100);
  const [clubId, setClubId] = useState('');

  // Conflict Alert feedback from server
  const [conflictReport, setConflictReport] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

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
        if (json.clubs.length > 0 && !clubId) {
          setClubId(json.clubs[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchClubs();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole === 'MEMBER') return;

    setConflictReport(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          venue,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          audienceType,
          expectedAudience,
          clubId,
          userRole: currentRole,
        }),
      });

      const result = await res.json();
      if (result.conflictReport) {
        setConflictReport(result.conflictReport);
      }
      if (result.success) {
        fetchEvents();
        setTitle('');
        setDescription('');
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

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
    <div className="space-y-8">
      {/* 1. Header KPI Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled Events</div>
            <div className="text-2xl font-black text-white mt-1">{events.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Activities</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{approvedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            ✓
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Flagged Clashes</div>
            <div className="text-2xl font-black text-red-400 mt-1">{conflictCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold">
            <AlertTriangleIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Conflict Warning Alert Box */}
      {conflictReport && conflictReport.hasConflict && (
        <div className="bg-gradient-to-br from-red-950/90 via-red-900/40 to-slate-900 border-2 border-red-500/80 p-6 rounded-2xl text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 text-red-400 font-extrabold text-lg mb-2">
            <AlertTriangleIcon className="w-6 h-6 text-red-400 animate-pulse" />
            Scheduling Conflict Identified!
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mb-4 leading-relaxed">
            The conflict engine identified overlapping campus events. The proposal has been flagged in red for ACM Core verification.
          </p>

          {conflictReport.hardConflicts.length > 0 && (
            <div className="space-y-2 mb-3">
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Venue Clashes:</span>
              {conflictReport.hardConflicts.map((c: any, idx: number) => (
                <div key={idx} className="bg-red-900/40 border border-red-700/60 p-3 rounded-xl text-xs text-red-200 font-medium">
                  ⚠️ {c.reason}
                </div>
              ))}
            </div>
          )}

          {conflictReport.softConflicts.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Audience Overlap Clashes:</span>
              {conflictReport.softConflicts.map((c: any, idx: number) => (
                <div key={idx} className="bg-amber-950/50 border border-amber-700/60 p-3 rounded-xl text-xs text-amber-200 font-medium">
                  ⚡ {c.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. Schedule Event Form or Member Read-Only Notice */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-md text-white">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
              <PlusCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Submit Proposal</h2>
              <p className="text-xs text-slate-400">Draft campus event for verification</p>
            </div>
          </div>

          {currentRole === 'MEMBER' ? (
            <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto text-slate-400 shadow-inner">
                <ShieldCheckIcon className="w-6 h-6 text-slate-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">Read-Only Schedule View</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                As a Regular Member, you have campus-wide visibility to explore upcoming events and check conflict statuses. 
                Submitting new event proposals is restricted to Club Executives and ACM Core.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateEvent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Organizing Club</label>
                <select
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ACM Web Development Workshop"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Venue</label>
                <select
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Seminar Hall 1">Seminar Hall 1</option>
                  <option value="Seminar Hall 2">Seminar Hall 2</option>
                  <option value="Central Auditorium">Central Auditorium</option>
                  <option value="CS Dept Lab 3">CS Dept Lab 3</option>
                  <option value="ECE Seminar Hall">ECE Seminar Hall</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Group</label>
                  <select
                    value={audienceType}
                    onChange={(e) => setAudienceType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="TECH_UG">Tech Undergrads</option>
                    <option value="TECH_PG">Tech Postgrads</option>
                    <option value="NON_TECH_CULTURAL">Cultural / Non-Tech</option>
                    <option value="SPORTS">Sports</option>
                    <option value="ALL_CAMPUS">All Campus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={expectedAudience}
                    onChange={(e) => setExpectedAudience(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objectives, speaker details, requirements..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs transition-all duration-200 shadow-md shadow-blue-500/20"
              >
                {submitting ? 'Verifying Overlaps...' : 'Check Conflicts & Submit'}
              </button>
            </form>
          )}
        </div>

        {/* 4. Centralized Campus Events View */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl backdrop-blur-md">
            {/* Live Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event, venue, or club..."
              className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-64"
            />

            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved Only</option>
                <option value="FLAGGED_CONFLICT">Conflicts Only</option>
                <option value="PENDING">Pending Only</option>
              </select>

              <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'calendar' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'calendar' ? (
            <CalendarView events={filteredEvents} />
          ) : (
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

                        {/* STRICTLY ONLY ACM Core Verifier gets action buttons */}
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
        </div>
      </div>
    </div>
  );
}
