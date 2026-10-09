'use client';

import React from 'react';
import { AlertTriangleIcon, ClockIcon, MapPinIcon, UsersIcon } from './Icons';

interface ClashesPanelProps {
  events: any[];
  currentRole: string;
  onUpdateStatus: (id: string, status: string) => void;
}

export default function ClashesPanel({
  events,
  currentRole,
  onUpdateStatus,
}: ClashesPanelProps) {
  const conflictEvents = events.filter((e) => e.status === 'FLAGGED_CONFLICT');

  if (conflictEvents.length === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center text-white backdrop-blur-md">
        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-lg font-bold">
          ✓
        </div>
        <h4 className="text-base font-bold text-white">All Schedules Clear!</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          No active venue clashes or audience overlaps detected across any campus clubs.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md text-white space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangleIcon className="w-5 h-5 text-red-400 animate-pulse" />
            Detected Scheduling Clashes ({conflictEvents.length})
          </h3>
          <p className="text-xs text-slate-400">
            Conflicting proposals flagged by the conflict detection engine
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {conflictEvents.map((ev) => (
          <div
            key={ev.id}
            className="p-4 rounded-xl border border-red-500/40 bg-gradient-to-r from-red-950/40 to-slate-950/80 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{ev.title}</span>
                <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full font-bold uppercase">
                  Flagged Conflict
                </span>
              </div>
              <p className="text-xs text-blue-400 font-semibold mt-0.5">{ev.club?.name}</p>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300">
                <div className="flex items-center gap-1 text-red-300 font-semibold">
                  <MapPinIcon className="w-3.5 h-3.5 text-red-400" />
                  <span>{ev.venue}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {new Date(ev.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{ev.audienceType}</span>
                </div>
              </div>
            </div>

            {/* Core Verifier Actions */}
            {currentRole === 'ACM_CORE' && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onUpdateStatus(ev.id, 'APPROVED')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Override & Approve
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(ev.id, 'REJECTED')}
                  className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
