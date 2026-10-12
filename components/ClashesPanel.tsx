'use client';

import React from 'react';
import { AlertTriangleIcon, ClockIcon, MapPinIcon, UsersIcon } from './Icons';
import { getClubTheme } from '@/lib/colors';

interface ClashesPanelProps {
  conflicts: any[];
  isCoreVerifier: boolean;
  onResolve: (conflictId: string, status: string, note?: string) => void;
}

export default function ClashesPanel({
  conflicts,
  isCoreVerifier,
  onResolve,
}: ClashesPanelProps) {
  const flaggedConflicts = conflicts.filter((c) => c.status === 'FLAGGED');

  if (flaggedConflicts.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-900 shadow-sm">
        <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 text-lg font-bold">
          ✓
        </div>
        <h4 className="text-base font-bold text-slate-900">All Schedules Clear!</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No active venue clashes or audience overlaps flagged across campus clubs.
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
            Detected Scheduling Clashes ({flaggedConflicts.length})
          </h3>
          <p className="text-xs text-slate-500">
            Potential venue and audience overlaps flagged for human administrator review (ACM Core).
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {flaggedConflicts.map((c) => {
          const ev = c.event;
          const confEv = c.conflictingEvent;
          const clubTheme = getClubTheme(ev?.clubName);

          return (
            <div
              key={c.id}
              className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {ev?.title || 'Primary Event'} vs {confEv?.title || 'Conflicting Event'}
                  </span>
                  <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full font-bold uppercase">
                    FLAGGED
                  </span>
                </div>

                <p className="text-xs text-rose-800 font-medium">
                  {c.reason}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-1 text-rose-700 font-semibold">
                    <MapPinIcon className="w-3.5 h-3.5 text-rose-600" />
                    <span>Venue: {ev?.venue}</span>
                  </div>
                  {c.overlapStart && c.overlapEnd && (
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Overlap: {new Date(c.overlapStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(c.overlapEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Core Verifier Decision Making */}
              {isCoreVerifier && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onResolve(c.id, 'RESOLVED', 'Resolved after schedule alignment.')}
                    className="px-3 py-1.5 btn-primary-gradient text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Resolve Conflict
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolve(c.id, 'DISMISSED', 'Dismissed by ACM Core admin as acceptable overlap.')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    Dismiss Warning
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
