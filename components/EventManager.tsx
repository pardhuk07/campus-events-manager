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

  // View state: 'calendar' vs 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

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
    if (filterStatus === 'ALL') return true;
    return ev.status === filterStatus;
  });

  return (
    <div className="space-y-8">
      {/* 1. Conflict Warning Alert Box */}
      {conflictReport && conflictReport.hasConflict && (
        <div className="bg-red-950/80 border-2 border-red-500 p-5 rounded-xl text-white shadow-xl animate-in fade-in">
          <div className="flex items-center gap-3 text-red-400 font-bold text-lg mb-2">
            <AlertTriangleIcon className="w-6 h-6 text-red-400 animate-pulse" />
            Scheduling Conflict Detected!
          </div>
          <p className="text-sm text-slate-300 mb-3">
            The conflict engine identified overlapping campus events. The event proposal was flagged for ACM Core verification.
          </p>

          {conflictReport.hardConflicts.length > 0 && (
            <div className="space-y-1 mb-3">
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Venue Clashes:</span>
              {conflictReport.hardConflicts.map((c: any, idx: number) => (
                <div key={idx} className="bg-red-900/40 p-2 rounded text-xs text-red-200">
                  ⚠️ {c.reason}
                </div>
              ))}
            </div>
          )}

          {conflictReport.softConflicts.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Audience Overlap Clashes:</span>
              {conflictReport.softConflicts.map((c: any, idx: number) => (
                <div key={idx} className="bg-amber-950/50 p-2 rounded text-xs text-amber-200">
                  ⚡ {c.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 2. Schedule Event Form or Member Read-Only Notice */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm text-white">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PlusCircleIcon className="w-5 h-5 text-blue-400" />
            Submit Event Proposal
          </h2>

          {currentRole === 'MEMBER' ? (
            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl text-center space-y-3">
              <div className="w-10 h-10 bg-slate-700/60 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <ShieldCheckIcon className="w-5 h-5 text-slate-400" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Read-Only Schedule View</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                As a Regular Member, you have campus-wide visibility to explore upcoming events and check conflict statuses. 
                Submitting new event proposals is restricted to authorized Club Executives and ACM Core.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Organizing Club</label>
                <select
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ACM Web Development Workshop"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Venue</label>
                <select
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Seminar Hall 1">Seminar Hall 1</option>
                  <option value="Seminar Hall 2">Seminar Hall 2</option>
                  <option value="Central Auditorium">Central Auditorium</option>
                  <option value="CS Dept Lab 3">CS Dept Lab 3</option>
                  <option value="ECE Seminar Hall">ECE Seminar Hall</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Audience</label>
                  <select
                    value={audienceType}
                    onChange={(e) => setAudienceType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="TECH_UG">Tech Undergraduates</option>
                    <option value="TECH_PG">Tech Postgraduates</option>
                    <option value="NON_TECH_CULTURAL">Cultural / Non-Tech</option>
                    <option value="SPORTS">Sports</option>
                    <option value="ALL_CAMPUS">Open to All Campus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Expected Capacity</label>
                  <input
                    type="number"
                    value={expectedAudience}
                    onChange={(e) => setExpectedAudience(parseInt(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objectives, speaker details, requirements..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors shadow"
              >
                {submitting ? 'Verifying Conflicts...' : 'Check Conflicts & Submit'}
              </button>
            </form>
          )}
        </div>

        {/* 3. Centralized Campus Events View */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Campus Events</h3>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                {events.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved Only</option>
                <option value="FLAGGED_CONFLICT">Conflicts Only</option>
                <option value="PENDING">Pending Only</option>
              </select>

              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    viewMode === 'calendar' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Calendar Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  List Cards
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'calendar' ? (
            <CalendarView events={filteredEvents} />
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm text-white">
              {filteredEvents.length === 0 ? (
                <p className="text-slate-500 text-sm italic">No events match the selected criteria.</p>
              ) : (
                <div className="space-y-3">
                  {filteredEvents.map((ev) => {
                    const isConflict = ev.status === 'FLAGGED_CONFLICT';
                    return (
                      <div
                        key={ev.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isConflict
                            ? 'bg-red-950/30 border-red-800/80 hover:border-red-600'
                            : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-base">{ev.title}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
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
                            <span className="text-xs text-blue-400 font-medium">{ev.club?.name}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs text-slate-300">
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
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80">
                            <span className="text-[11px] text-slate-400 font-medium">Core Actions:</span>
                            <button
                              onClick={() => handleUpdateStatus(ev.id, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded text-xs transition"
                            >
                              ✓ {ev.status === 'FLAGGED_CONFLICT' ? 'Override & Approve' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(ev.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded text-xs transition"
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
