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
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm text-slate-900">
      {/* 1. Month Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900">
                {monthNames[month]} {year}
              </h3>
              <p className="text-xs text-slate-500 font-medium">Campus Activities Matrix</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={today}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition shadow-sm"
          >
            Today
          </button>
          <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200 p-0.5 shadow-sm">
            <button
              type="button"
              onClick={prevMonth}
              className="px-3 py-1 text-xs font-semibold hover:bg-white rounded-lg text-slate-700 transition"
              title="Previous Month"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="px-3 py-1 text-xs font-semibold hover:bg-white rounded-lg text-slate-700 transition"
              title="Next Month"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* 2. Status & Club Color Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-500">Status:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span>
            <span className="text-slate-700 font-medium">Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm"></span>
            <span className="text-slate-700 font-medium">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-sm"></span>
            <span className="text-rose-700 font-bold">Conflict</span>
          </div>
        </div>

        {/* Club Color Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-500">Club Colors:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <span className="text-slate-700 font-medium">ACM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span className="text-slate-700 font-medium">IEEE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-slate-700 font-medium">CSI</span>
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
          <div key={`empty-${i}`} className="min-h-[96px] bg-slate-50/50 rounded-xl border border-slate-100 p-1 opacity-40"></div>
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
              className={`min-h-[96px] p-2 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                isToday
                  ? 'bg-indigo-50/40 border-indigo-400 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                    isToday ? 'btn-primary-gradient text-white' : 'text-slate-600'
                  }`}
                >
                  {day}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Chips (Color-coded by Club, Status shown via indicator) */}
              <div className="space-y-1 mt-1.5 overflow-hidden">
                {dayEvents.slice(0, 2).map((ev) => {
                  const clubTheme = getClubTheme(ev.club?.name);
                  const isConflict = ev.status === 'FLAGGED_CONFLICT';

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setSelectedEventModal(ev)}
                      className={`w-full text-left truncate text-[11px] px-2 py-1 rounded-lg font-semibold border transition-all duration-150 shadow-xs flex items-center gap-1.5 ${
                        isConflict
                          ? 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
                          : `${clubTheme.bg} ${clubTheme.text} ${clubTheme.border} hover:scale-[1.02]`
                      }`}
                      title={`${ev.title} (${ev.venue})`}
                    >
                      {/* Distinct Club Color Dot */}
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isConflict ? 'bg-rose-500' : clubTheme.dot
                        }`}
                      ></span>
                      <span className="truncate">{ev.title}</span>
                    </button>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div className="text-[10px] text-indigo-600 font-bold pl-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full tracking-wider ${
                    selectedEventModal.status === 'FLAGGED_CONFLICT'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : selectedEventModal.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {selectedEventModal.status}
                </span>
                <h4 className="text-lg font-bold mt-2 text-slate-900">{selectedEventModal.title}</h4>
                <p className={`text-xs font-semibold ${getClubTheme(selectedEventModal.club?.name).text}`}>
                  {selectedEventModal.club?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventModal(null)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              {selectedEventModal.description || 'No additional description provided.'}
            </p>

            <div className="space-y-2.5 mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-slate-400" />
                <span>Venue: <strong className="text-slate-900">{selectedEventModal.venue}</strong></span>
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
                <span>Target: <strong className="text-slate-900">{selectedEventModal.audienceType}</strong> ({selectedEventModal.expectedAudience} cap)</span>
              </div>
            </div>

            {selectedEventModal.status === 'FLAGGED_CONFLICT' && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>This event has flagged scheduling clashes. Verification from ACM Core is required.</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedEventModal(null)}
              className="mt-5 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2.5 rounded-xl transition border border-slate-200 shadow-sm"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
