'use client';

import React from 'react';
import { AlertTriangleIcon, ClockIcon, MapPinIcon, UsersIcon } from './Icons';
import { getClubTheme } from '@/lib/colors';

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
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-900 shadow-sm">
        <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 text-lg font-bold">
          ✓
        </div>
        <h4 className="text-base font-bold text-slate-900">All Schedules Clear!</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No active venue clashes or audience overlaps detected across any campus clubs.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-900 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangleIcon className="w-5 h-5 text-rose-600 animate-pulse" />
            Detected Scheduling Clashes ({conflictEvents.length})
          </h3>
          <p className="text-xs text-slate-500">
            Conflicting proposals flagged by the conflict detection engine
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {conflictEvents.map((ev) => {
          const clubTheme = getClubTheme(ev.club?.name);

          return (
            <div
              key={ev.id}
              className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{ev.title}</span>
                  <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full font-bold uppercase">
                    Flagged Clash
                  </span>
                </div>
                <p className={`text-xs font-semibold mt-0.5 ${clubTheme.text}`}>{ev.club?.name}</p>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1 text-rose-700 font-semibold">
                    <MapPinIcon className="w-3.5 h-3.5 text-rose-600" />
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
                    className="px-3 py-1.5 btn-primary-gradient text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Override & Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(ev.id, 'REJECTED')}
                    className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
