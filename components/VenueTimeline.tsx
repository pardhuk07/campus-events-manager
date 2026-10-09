'use client';

import React, { useState } from 'react';
import { ClockIcon, MapPinIcon } from './Icons';

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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md text-white">
      {/* Header with Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-blue-400" />
            Venue vs. Hours Timeline
          </h3>
          <p className="text-xs text-slate-400">Visual occupancy grid across all campus facilities</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Timeline Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-2.5 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Timeline Grid Container */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[750px] space-y-2">
          {/* Hour Headers */}
          <div style={gridStyle} className="gap-1 mb-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="text-left pl-2 font-bold text-slate-300">Venue</div>
            {HOURS.map((h) => (
              <div key={h} className="py-1 bg-slate-950/80 rounded-md border border-slate-800">
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
                className="gap-1 items-center bg-slate-950/40 rounded-xl p-1.5 border border-slate-800/60 min-h-[58px]"
              >
                {/* Venue Label */}
                <div className="text-xs font-semibold text-slate-300 truncate pr-2 pl-1.5 flex items-center gap-1.5">
                  <MapPinIcon className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="truncate">{venueName}</span>
                </div>

                {/* 12 Hour Slot Cells */}
                {HOURS.map((hour) => {
                  const activeInHour = venueEvents.filter((ev) => {
                    const s = new Date(ev.startTime).getHours();
                    const e = new Date(ev.endTime).getHours();
                    return hour >= s && hour < (e === s ? s + 1 : e);
                  });

                  const isConflict = activeInHour.some((e) => e.status === 'FLAGGED_CONFLICT');
                  const hasDoubleBooking = activeInHour.length > 1;

                  return (
                    <div
                      key={hour}
                      className={`h-11 rounded-lg border transition flex flex-col justify-center items-center p-1 relative text-[10px] ${
                        hasDoubleBooking || isConflict
                          ? 'bg-red-950/70 border-red-500/80 text-red-200 animate-pulse shadow-sm shadow-red-500/20'
                          : activeInHour.length > 0
                          ? 'bg-blue-900/40 border-blue-600/70 text-blue-200'
                          : 'bg-slate-900/30 border-slate-800/40 hover:bg-slate-800/40'
                      }`}
                      title={
                        activeInHour.length > 0
                          ? activeInHour.map((e) => `${e.title} (${e.club?.name})`).join('\n')
                          : 'Free Slot'
                      }
                    >
                      {activeInHour.length > 0 ? (
                        <div className="w-full text-center truncate font-bold text-[9px]">
                          {hasDoubleBooking ? (
                            <span className="text-red-300 font-bold">⚠️ Clash!</span>
                          ) : (
                            activeInHour[0].title
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-700 text-[9px]">•</span>
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
