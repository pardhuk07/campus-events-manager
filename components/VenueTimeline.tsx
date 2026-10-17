'use client';

import React, { useState } from 'react';
import { ClockIcon, MapPinIcon } from './Icons';
import { getClubTheme } from '@/lib/colors';

interface VenueTimelineProps {
  events: any[];
  onSelectEvent?: (event: any) => void;
}

const VENUES = [
  'Seminar Hall 1',
  'Seminar Hall 2',
  'Central Auditorium',
  'CS Dept Lab 3',
  'ECE Seminar Hall',
];

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]; // 9 AM to 8 PM

export default function VenueTimeline({ events, onSelectEvent }: VenueTimelineProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (events.length > 0) {
      return new Date(events[0].startTime).toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });

  const dayEvents = events.filter((ev) => {
    const evDate = new Date(ev.startTime).toISOString().slice(0, 10);
    return evDate === selectedDate;
  });

  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h;
    return `${displayH} ${period}`;
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '140px repeat(12, minmax(48px, 1fr))',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-900">
      {/* Header with Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-indigo-600" />
            Venue vs. Hours Timeline
          </h3>
          <p className="text-xs text-slate-500">Visual occupancy grid across all campus facilities</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium">Timeline Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs text-slate-800 rounded-xl px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
          >
          </input>
        </div>
      </div>

      {/* Mobile Swipe Hint */}
      <div className="sm:hidden mb-3 px-3 py-1.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-[11px] text-indigo-700 flex items-center justify-between">
        <span>👉 Swipe left/right to view all venue hours</span>
        <span className="font-bold">9 AM - 8 PM</span>
      </div>

      {/* Timeline Grid Container */}
      <div className="overflow-x-auto pb-2 touch-scroll">
        <div className="min-w-[750px] space-y-2">
          {/* Hour Headers */}
          <div style={gridStyle} className="gap-1 mb-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="text-left pl-2 font-bold text-slate-700">Venue</div>
            {HOURS.map((h) => (
              <div key={h} className="py-1 bg-slate-100 rounded-md border border-slate-200 text-slate-600">
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* Venue Rows */}
          {VENUES.map((venueName) => {
            const venueEvents = dayEvents.filter(
              (ev) => ev.venue.trim().toLowerCase() === venueName.toLowerCase()
            );

            return (
              <div
                key={venueName}
                style={gridStyle}
                className="gap-1 items-center bg-slate-50/70 rounded-xl p-1.5 border border-slate-200 min-h-[58px]"
              >
                {/* Venue Label */}
                <div className="text-xs font-semibold text-slate-700 truncate pr-2 pl-1.5 flex items-center gap-1.5">
                  <MapPinIcon className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span className="truncate">{venueName}</span>
                </div>

                {/* 12 Hour Slot Cells */}
                {HOURS.map((h) => {
                  const activeEvents = venueEvents.filter((ev) => {
                    const sH = new Date(ev.startTime).getHours();
                    const eH = new Date(ev.endTime).getHours();
                    return h >= sH && h < eH;
                  });

                  const isOccupied = activeEvents.length > 0;
                  const isConflict = activeEvents.length > 1;
                  const firstEv = activeEvents[0];
                  const clubTheme = firstEv ? getClubTheme(firstEv.club?.name) : null;

                  return (
                    <div
                      key={h}
                      className={`h-11 rounded-lg border flex flex-col justify-center items-center text-[10px] p-0.5 transition ${
                        isConflict
                          ? 'bg-rose-100 border-rose-300 text-rose-800 font-extrabold animate-pulse'
                          : isOccupied
                          ? `${clubTheme?.bg} ${clubTheme?.border} ${clubTheme?.text} font-bold shadow-xs`
                          : 'bg-white border-slate-200/80 text-slate-300'
                      }`}
                      title={
                        isConflict
                          ? `DOUBLE BOOKED: ${activeEvents.map((e) => e.title).join(' & ')}`
                          : isOccupied
                          ? `${firstEv.title} (${firstEv.club?.name || 'Club'})`
                          : 'Free slot'
                      }
                    >
                      {isConflict ? (
                        <span className="text-[9px] text-rose-700">CLASH!</span>
                      ) : isOccupied ? (
                        <div className="w-full text-center truncate px-0.5">
                          <span className="truncate block">{firstEv.title}</span>
                        </div>
                      ) : (
                        <span className="text-[8px] opacity-40">Free</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
