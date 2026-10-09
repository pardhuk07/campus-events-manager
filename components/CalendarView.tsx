'use client';

import React, { useState, useEffect } from 'react';
import { CalendarIcon, ClockIcon, MapPinIcon, UsersIcon, AlertTriangleIcon } from './Icons';

interface CalendarViewProps {
  events: any[];
  onSelectEvent?: (event: any) => void;
}

export default function CalendarView({ events, onSelectEvent }: CalendarViewProps) {
  // Use a fixed initial state to avoid Next.js 16 SSR hydration mismatch, then sync on mount
  const [currentDate, setCurrentDate] = useState<Date>(new Date('2026-10-01T00:00:00Z'));
  const [mounted, setMounted] = useState(false);
  const [selectedEventModal, setSelectedEventModal] = useState<any | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
    setMounted(true);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month and number of days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Map events to specific day
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
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg text-white">
      {/* 1. Header with Month navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-400" />
            {monthNames[month]} {year}
          </h3>
          <p className="text-xs text-slate-400">Interactive Campus Event Visualizer</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={today}
            className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            Today
          </button>
          <button
            type="button"
            onClick={prevMonth}
            className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            &lt; Prev
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            Next &gt;
          </button>
        </div>
      </div>

      {/* 2. Status Color Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
        <span className="font-semibold text-slate-400">Conflict Indicators:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300">Approved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-slate-300">Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-red-400 font-bold">Conflict Flagged</span>
        </div>
      </div>

      {/* 3. Days of the Week */}
      <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-400 mb-2">
        <div className="py-1">Sun</div>
        <div className="py-1">Mon</div>
        <div className="py-1">Tue</div>
        <div className="py-1">Wed</div>
        <div className="py-1">Thu</div>
        <div className="py-1">Fri</div>
        <div className="py-1">Sat</div>
      </div>

      {/* 4. Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[85px] bg-slate-950/40 rounded-lg border border-slate-800/30 p-1 opacity-25"></div>
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
              className={`min-h-[85px] p-1.5 rounded-lg border transition-colors flex flex-col justify-between ${
                isToday
                  ? 'bg-blue-950/30 border-blue-500/50'
                  : 'bg-slate-800/40 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold px-1 rounded ${
                    isToday ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  {day}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event chips */}
              <div className="space-y-1 mt-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((ev) => {
                  const isConflict = ev.status === 'FLAGGED_CONFLICT';
                  const isApproved = ev.status === 'APPROVED';

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setSelectedEventModal(ev)}
                      className={`w-full text-left truncate text-[10px] px-1.5 py-0.5 rounded font-medium border transition ${
                        isConflict
                          ? 'bg-red-950/80 text-red-200 border-red-700 hover:bg-red-900'
                          : isApproved
                          ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700 hover:bg-emerald-900'
                          : 'bg-amber-950/80 text-amber-200 border-amber-700 hover:bg-amber-900'
                      }`}
                      title={`${ev.title} (${ev.venue})`}
                    >
                      {ev.title}
                    </button>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div className="text-[9px] text-slate-400 font-medium pl-1">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Detailed Event Inspection Modal */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 text-white shadow-2xl animate-in fade-in">
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    selectedEventModal.status === 'FLAGGED_CONFLICT'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : selectedEventModal.status === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {selectedEventModal.status}
                </span>
                <h4 className="text-lg font-bold mt-1 text-white">{selectedEventModal.title}</h4>
                <p className="text-xs text-blue-400 font-medium">{selectedEventModal.club?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              {selectedEventModal.description || 'No description provided.'}
            </p>

            <div className="space-y-2 mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-slate-400" />
                <span>Venue: <strong>{selectedEventModal.venue}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-slate-400" />
                <span>
                  {new Date(selectedEventModal.startTime).toLocaleString()} -{' '}
                  {new Date(selectedEventModal.endTime).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-slate-400" />
                <span>Target: <strong>{selectedEventModal.audienceType}</strong> (Capacity: {selectedEventModal.expectedAudience})</span>
              </div>
            </div>

            {selectedEventModal.status === 'FLAGGED_CONFLICT' && (
              <div className="mt-4 p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-start gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>This event has flagged scheduling clashes. Verification from ACM Core is required.</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedEventModal(null)}
              className="mt-5 w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-2 rounded-lg transition"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
