'use client';

import React, { useState, useEffect } from 'react';
import {
  PlusCircleIcon,
  AlertTriangleIcon,
} from './Icons';
import { UserRole } from '@/lib/constants';

interface EventDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clubs: any[];
  currentRole: string;
  onEventCreated: () => void;
  initialDate?: string;
}

export default function EventDrawer({
  isOpen,
  onClose,
  clubs,
  currentRole,
  onEventCreated,
  initialDate,
}: EventDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('Seminar Hall 1');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [audienceTag, setAudienceTag] = useState('TECH_UG');
  const [expectedAttendance, setExpectedAttendance] = useState(100);
  const [category, setCategory] = useState('Technical Workshop');
  const [clubId, setClubId] = useState('');

  // Live as-you-type conflict state
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [liveConflictResult, setLiveConflictResult] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (clubs.length > 0 && !clubId) {
      setClubId(clubs[0].id);
    }
    if (initialDate && !startTime) {
      setStartTime(`${initialDate}T10:00`);
      setEndTime(`${initialDate}T12:00`);
    }
  }, [clubs, initialDate]);

  useEffect(() => {
    if (!venue || !startTime || !endTime) {
      setLiveConflictResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingConflict(true);
      try {
        const res = await fetch('/api/conflicts/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            venue,
            audienceTags: [audienceTag],
          }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setLiveConflictResult(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingConflict(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [venue, startTime, endTime, audienceTag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole === UserRole.MEMBER) return;

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
          audienceTags: [audienceTag],
          expectedAttendance,
          category,
          clubId,
          userRole: currentRole,
        }),
      });

      const result = await res.json();
      if (result.success) {
        onEventCreated();
        onClose();
        setTitle('');
        setDescription('');
      } else {
        const errorMsg =
          typeof result.error === 'string'
            ? result.error
            : result.error?.message || JSON.stringify(result.error) || 'Failed to submit proposal';
        alert(errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to connect to events service.');
    } finally {
      setSubmitting(false);
    }
  };

  const applySuggestedSlot = (slot: { start: string; end: string }) => {
    const s = new Date(slot.start);
    const e = new Date(slot.end);
    const formatLocal = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setStartTime(formatLocal(s));
    setEndTime(formatLocal(e));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-white sm:border-l border-slate-200 h-full overflow-y-auto p-4 sm:p-7 shadow-2xl flex flex-col justify-between text-slate-900 animate-in slide-in-from-right duration-300">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                <PlusCircleIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Submit Event Proposal</h3>
                <p className="text-xs text-slate-500 font-medium">Automatic conflict verification & scheduling</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 text-base font-bold"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Organizing Club</label>
              <select
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
              >
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. ACM TechFest Inauguration"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Venue</label>
              <select
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* LIVE CONFLICT FEEDBACK & FREE SLOT SUGGESTIONS */}
            {checkingConflict && (
              <div className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                <span>Checking venue availability and potential clashes in real time...</span>
              </div>
            )}

            {liveConflictResult && !checkingConflict && (
              <div
                className={`p-3.5 rounded-xl border transition text-xs ${
                  liveConflictResult.hasConflict
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {liveConflictResult.hasConflict ? (
                    <>
                      <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Scheduling Clash Detected!</span>
                    </>
                  ) : (
                    <>
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Slot Available! No conflicts detected for this venue & time.</span>
                    </>
                  )}
                </div>

                {liveConflictResult.hasConflict && (
                  <div className="space-y-1 mt-2">
                    {liveConflictResult.flags && liveConflictResult.flags.length > 0 ? (
                      liveConflictResult.flags.map((flag: string, idx: number) => (
                        <p key={idx} className="text-[11px] text-rose-800 font-medium flex items-start gap-1">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{flag}</span>
                        </p>
                      ))
                    ) : (
                      <p className="text-[11px] text-rose-700 font-medium">
                        {liveConflictResult.conflicts?.[0]?.reason || 'Clashes with another booked campus event.'}
                      </p>
                    )}

                    {/* Suggested alternative free slots */}
                    {liveConflictResult.suggestedSlots?.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-rose-200">
                        <span className="text-[11px] font-bold text-rose-900 block mb-1">
                          Suggested Free Slots on this Day:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {liveConflictResult.suggestedSlots.map((slot: any, idx: number) => {
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => applySuggestedSlot(slot)}
                                className="px-2 py-1 rounded-lg bg-white border border-rose-300 text-rose-900 text-[10px] font-bold hover:bg-rose-100 transition shadow-xs"
                              >
                                {slot.label} (Apply)
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Audience Target</label>
                <select
                  value={audienceTag}
                  onChange={(e) => setAudienceTag(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="ALL_STUDENTS">All Campus Students</option>
                  <option value="TECH_UG">Tech Undergraduates</option>
                  <option value="TECH_PG">Postgraduate Students</option>
                  <option value="FIRST_YEAR">First Year Students</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={expectedAttendance}
                  onChange={(e) => setExpectedAttendance(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Proposal Brief</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly state objectives, speakers, and campus relevance..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary-gradient disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition shadow-md mt-4"
            >
              {submitting ? 'Submitting Proposal...' : 'Submit Event for Review'}
            </button>
          </form>
        </div>

        <div className="pt-4 border-t border-slate-200 text-center text-[11px] text-slate-400">
          Proposals are reviewed under ACM conflict-resolution guidelines.
        </div>
      </div>
    </div>
  );
}
