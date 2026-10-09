'use client';

import React, { useState, useEffect } from 'react';
import { CalendarIcon, ClockIcon, MapPinIcon, UsersIcon, AlertTriangleIcon } from './Icons';
import { getClubTheme } from '@/lib/colors';

interface CalendarViewProps {
  events: any[];
  onSelectEvent?: (event: any) => void;
}

export default function CalendarView({ events, onSelectEvent }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date('2026-10-01T00:00:00Z'));
  const [mounted, setMounted] = useState(false);
  const [selectedEventModal, setSelectedEventModal] = useState<any | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
    setMounted(true);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getEventsForDay = (day: number) => {
    return events.filter((ev) => {
      const evDate = new Date(ev.startTime);
      return (
        evDate.getFullYear() === year &&
        evDate.getMonth() === month &&
        evDate.getDate() === day
      );
    });
  };

  return (
    <div className="bg-[#0b1328] border border-[var(--border-navy)] rounded-2xl p-5 sm:p-6 shadow-xl text-white">
      {/* 1. Month Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-[var(--border-navy)]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#101b37] border border-[var(--border-navy-light)] text-cyan-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">
                {monthNames[month]} {year}
              </h3>
              <p className="text-xs text-slate-400 font-medium">Campus Activities Matrix</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={today}
            className="px-3 py-1.5 text-xs font-semibold bg-[#101b37] hover:bg-[#172447] text-slate-300 rounded-xl border border-[var(--border-navy)] transition shadow-sm"
          >
            Today
          </button>
          <div className="flex items-center rounded-xl bg-[#101b37] border border-[var(--border-navy)] p-0.5 shadow-sm">
            <button
              type="button"
              onClick={prevMonth}
              className="px-3 py-1 text-xs font-semibold hover:bg-[#172447] rounded-lg text-slate-300 transition"
              title="Previous Month"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="px-3 py-1 text-xs font-semibold hover:bg-[#172447] rounded-lg text-slate-300 transition"
              title="Next Month"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* 2. Status & Club Color Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-[#060b18] p-3 rounded-xl border border-[var(--border-navy)] text-xs">
        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-400">Status:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-approved)] shadow-sm"></span>
            <span className="text-slate-300 font-medium">Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-pending)] shadow-sm"></span>
            <span className="text-slate-300 font-medium">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-conflict)] animate-pulse shadow-sm"></span>
            <span className="text-red-400 font-bold">Conflict</span>
          </div>
        </div>

        {/* Club Color Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-400">Club Colors:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--club-acm)]"></span>
            <span className="text-slate-300">ACM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--club-ieee)]"></span>
            <span className="text-slate-300">IEEE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--club-csi)]"></span>
            <span className="text-slate-300">CSI</span>
          </div>
        </div>
      </div>

      {/* 3. Days of the Week */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 mb-2 uppercase tracking-wider">
        <div className="py-1">Sun</div>
        <div className="py-1">Mon</div>
        <div className="py-1">Tue</div>
        <div className="py-1">Wed</div>
        <div className="py-1">Thu</div>
        <div className="py-1">Fri</div>
        <div className="py-1">Sat</div>
      </div>

      {/* 4. Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[92px] bg-[#060b18]/40 rounded-xl border border-[var(--border-navy)]/30 p-1 opacity-25"></div>
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = getEventsForDay(day);
          const isToday =
            mounted &&
            new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year;

          return (
            <div
              key={`day-${day}`}
              className={`min-h-[92px] p-2 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                isToday
                  ? 'bg-[#101b37] border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                  : 'bg-[#060b18]/70 border-[var(--border-navy)] hover:border-[var(--border-navy-light)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                    isToday ? 'btn-primary-gradient text-white' : 'text-slate-400'
                  }`}
                >
                  {day}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-500 font-bold">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Chips (Color-coded by Club, Status shown via indicator) */}
              <div className="space-y-1.5 mt-1.5 overflow-hidden">
                {dayEvents.slice(0, 2).map((ev) => {
                  const clubTheme = getClubTheme(ev.club?.name);
                  const isConflict = ev.status === 'FLAGGED_CONFLICT';

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setSelectedEventModal(ev)}
                      className={`w-full text-left truncate text-[11px] px-2 py-1 rounded-lg font-semibold border transition-all duration-150 shadow-sm flex items-center gap-1.5 ${
                        isConflict
                          ? 'bg-[var(--status-conflict-bg)] text-red-200 border-[var(--status-conflict-border)] animate-pulse'
                          : `${clubTheme.bg} ${clubTheme.text} ${clubTheme.border} hover:scale-[1.02]`
                      }`}
                      title={`${ev.title} (${ev.venue})`}
                    >
                      {/* Distinct Club Color Dot */}
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isConflict ? 'bg-[var(--status-conflict)]' : clubTheme.dot
                        }`}
                      ></span>
                      <span className="truncate">{ev.title}</span>
                    </button>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div className="text-[10px] text-cyan-400 font-bold pl-1">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Event Detail Inspection Modal */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b1328] border border-[var(--border-navy)] rounded-2xl max-w-md w-full p-6 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full tracking-wider ${
                    selectedEventModal.status === 'FLAGGED_CONFLICT'
                      ? 'bg-[var(--status-conflict-bg)] text-red-300 border border-[var(--status-conflict-border)]'
                      : selectedEventModal.status === 'APPROVED'
                      ? 'bg-[var(--status-approved-bg)] text-emerald-300 border border-[var(--status-approved-border)]'
                      : 'bg-[var(--status-pending-bg)] text-amber-300 border border-[var(--status-pending-border)]'
                  }`}
                >
                  {selectedEventModal.status}
                </span>
                <h4 className="text-lg font-bold mt-2 text-white">{selectedEventModal.title}</h4>
                <p className={`text-xs font-semibold ${getClubTheme(selectedEventModal.club?.name).text}`}>
                  {selectedEventModal.club?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventModal(null)}
                className="text-slate-400 hover:text-white text-base font-bold p-1 rounded-lg hover:bg-[#101b37]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed bg-[#060b18] p-3 rounded-xl border border-[var(--border-navy)]">
              {selectedEventModal.description || 'No additional description provided.'}
            </p>

            <div className="space-y-2.5 mt-4 pt-3 border-t border-[var(--border-navy)] text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-slate-400" />
                <span>Venue: <strong className="text-white">{selectedEventModal.venue}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-slate-400" />
                <span>
                  {new Date(selectedEventModal.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} -{' '}
                  {new Date(selectedEventModal.endTime).toLocaleTimeString([], { timeStyle: 'short' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-slate-400" />
                <span>Target: <strong className="text-white">{selectedEventModal.audienceType}</strong> ({selectedEventModal.expectedAudience} cap)</span>
              </div>
            </div>

            {selectedEventModal.status === 'FLAGGED_CONFLICT' && (
              <div className="mt-4 p-3 bg-[var(--status-conflict-bg)] border border-[var(--status-conflict-border)] rounded-xl text-xs text-red-200 flex items-start gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>This event has flagged scheduling clashes. Verification from ACM Core is required.</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedEventModal(null)}
              className="mt-5 w-full bg-[#101b37] hover:bg-[#172447] text-white text-xs font-semibold py-2.5 rounded-xl transition border border-[var(--border-navy)]"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
