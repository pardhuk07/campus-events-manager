'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangleIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  RupeeIcon,
  ShieldCheckIcon,
} from './Icons';
import { getClubTheme } from '@/lib/colors';
import { UserRole } from '@/lib/constants';

interface PendingReviewPanelProps {
  currentRole: string;
  currentUser?: any;
  onReviewCompleted?: () => void;
}

export default function PendingReviewPanel({
  currentRole,
  currentUser,
  onReviewCompleted,
}: PendingReviewPanelProps) {
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [budgetInfo, setBudgetInfo] = useState<{ total: number; spent: number; remaining: number }>({
    total: 50000,
    spent: 0,
    remaining: 50000,
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active action for required comments (reject or reschedule)
  const [activeAction, setActiveAction] = useState<{
    eventId: string;
    type: 'REJECT' | 'RESCHEDULE_REQUESTED';
  } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Conflict modal state for "Approve despite conflict?"
  const [conflictApprovalTarget, setConflictApprovalTarget] = useState<any | null>(null);

  const isCoreVerifier = currentRole === UserRole.CORE_VERIFIER || currentRole === 'ACM_CORE';

  const fetchPendingEvents = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/events/pending?userRole=${encodeURIComponent(currentRole)}`, {
        headers: {
          'x-user-role': currentRole,
        },
      });

      if (res.status === 403) {
        setErrorMsg('Access denied: The Pending Review queue is strictly restricted to ACM Core members.');
        setPendingEvents([]);
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        setPendingEvents(json.data.events || []);
        if (json.data.budget) {
          setBudgetInfo(json.data.budget);
        }
      } else {
        setErrorMsg(json.error?.message || json.error || 'Failed to load pending proposals.');
      }
    } catch (err: any) {
      console.error('Error fetching pending events:', err);
      setErrorMsg(err.message || 'Network error fetching pending reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCoreVerifier) {
      fetchPendingEvents();
    } else {
      setLoading(false);
      setErrorMsg('Access denied: The Pending Review queue is strictly restricted to ACM Core members.');
    }
  }, [currentRole]);

  const submitReview = async (
    eventId: string,
    decision: 'APPROVE' | 'REJECT' | 'RESCHEDULE_REQUESTED',
    comment?: string
  ) => {
    setSubmittingId(eventId);
    try {
      const reviewerName =
        currentUser?.name || (currentRole === 'ACM_CORE' || currentRole === UserRole.CORE_VERIFIER ? 'ACM Core Verifier' : 'Core Administrator');

      const res = await fetch(`/api/events/${eventId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({
          decision,
          comment: comment || null,
          reviewerName,
          userRole: currentRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Reset comment and modal states
        setActiveAction(null);
        setCommentText('');
        setConflictApprovalTarget(null);

        // Refresh list
        await fetchPendingEvents();
        if (onReviewCompleted) {
          onReviewCompleted();
        }
      } else {
        alert(data.error?.message || data.error || 'Failed to submit review decision.');
      }
    } catch (err: any) {
      console.error('Review error:', err);
      alert(err.message || 'Network error submitting review.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleApproveClick = (event: any) => {
    const hasFlags = (event.flags && event.flags.length > 0) || (event.conflictFlags && event.conflictFlags.length > 0);

    if (hasFlags) {
      // Conflicts must only warn: ask 'Approve despite conflict?' first
      setConflictApprovalTarget(event);
    } else {
      // Direct approval
      submitReview(event.id, 'APPROVE');
    }
  };

  const handleCommentSubmit = (eventId: string, type: 'REJECT' | 'RESCHEDULE_REQUESTED') => {
    if (!commentText.trim()) {
      alert(`A comment is required to ${type === 'REJECT' ? 'reject' : 'request reschedule for'} this event.`);
      return;
    }
    submitReview(eventId, type, commentText.trim());
  };

  if (!isCoreVerifier) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center text-slate-900 shadow-sm">
        <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center justify-center mx-auto mb-3 text-lg font-bold">
          ✕
        </div>
        <h4 className="text-base font-bold text-slate-900">Restricted Access</h4>
        <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto">
          The Pending Review panel is visible and accessible only to the ACM Core role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Panel Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ACM Core — Pending Event Reviews</h3>
              <p className="text-xs text-slate-500">
                Evaluate incoming campus event proposals, verify conflict warnings, and check semester budget impact.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>{pendingEvents.length} Pending Review{pendingEvents.length === 1 ? '' : 's'}</span>
          </div>
          <button
            type="button"
            onClick={fetchPendingEvents}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold transition"
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Loading state */}
      {loading && pendingEvents.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-xs">
          Loading pending reviews from database...
        </div>
      )}

      {/* Empty State */}
      {!loading && pendingEvents.length === 0 && !errorMsg && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-900 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 text-lg font-bold">
            ✓
          </div>
          <h4 className="text-base font-bold text-slate-900">All Caught Up!</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are currently no event proposals awaiting review. All submitted proposals have been evaluated.
          </p>
        </div>
      )}

      {/* Pending Events List - newest first */}
      <div className="space-y-4">
        {pendingEvents.map((ev) => {
          const clubTheme = getClubTheme(ev.club?.name);
          const rawCost = Number(ev.estimatedCost ?? 0);
          const X = isNaN(rawCost) ? 0 : rawCost;
          const Y = budgetInfo.remaining;
          const totalBudget = 50000;
          const Z = Y - X;

          // Budget impact styling rules:
          // Amber if remaining balance would fall below 20% (Z < 0.20 * 50000 = 10000)
          // Red if it would go negative (Z < 0)
          const isNegative = Z < 0;
          const isBelow20Percent = !isNegative && Z < totalBudget * 0.2;

          let budgetBgClass = 'bg-emerald-50 border-emerald-200 text-emerald-800';
          if (isNegative) {
            budgetBgClass = 'bg-rose-50 border-rose-300 text-rose-700 font-bold';
          } else if (isBelow20Percent) {
            budgetBgClass = 'bg-amber-50 border-amber-300 text-amber-800 font-bold';
          }

          // Conflict flags
          const flags: string[] = Array.isArray(ev.flags) && ev.flags.length > 0
            ? ev.flags
            : Array.isArray(ev.conflictFlags) && ev.conflictFlags.length > 0
            ? ev.conflictFlags
            : [];

          const isActionOpen = activeAction?.eventId === ev.id;

          return (
            <div
              key={ev.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition space-y-4 text-slate-900"
            >
              {/* Event Header & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-base">{ev.title}</span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {ev.eventType || ev.category || 'Workshop'}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                      Pending Review
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className={`font-semibold ${clubTheme.text}`}>
                      {ev.club?.name || 'General Campus Club'}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-medium">
                      Organizer: <strong className="text-slate-800">{ev.organizer || 'Not specified'}</strong>
                    </span>
                  </div>
                </div>

                {/* Proposal Submission Timestamp */}
                <div className="text-[11px] text-slate-400 shrink-0">
                  Submitted: {new Date(ev.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>

              {/* Event Description */}
              {ev.description && (
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  {ev.description}
                </p>
              )}

              {/* Event Metadata Chips */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-800">{ev.venue}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {new Date(ev.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} -{' '}
                    {new Date(ev.endTime).toLocaleTimeString([], { timeStyle: 'short' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{ev.audienceTags?.join(', ') || 'All Campus Students'}</span>
                </div>
              </div>

              {/* Conflict Flags Warning Section */}
              {flags.length > 0 && (
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangleIcon className="w-4 h-4 text-amber-600" />
                    <span>Conflict Warnings ({flags.length}):</span>
                  </div>
                  <ul className="space-y-1 text-xs text-amber-950 pl-5 list-disc">
                    {flags.map((flag, idx) => (
                      <li key={idx} className="leading-snug font-medium">
                        {flag}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-amber-700 italic pt-1">
                    Conflicts only warn; ACM Core may approve despite conflicts after evaluating scheduling feasibility.
                  </p>
                </div>
              )}

              {/* Budget Impact Line */}
              {/* Exact format: "Estimated cost ₹X. Remaining ₹Y of ₹50,000 → ₹Z after approval" */}
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${budgetBgClass}`}>
                <div className="flex items-center gap-2">
                  <RupeeIcon className="w-4 h-4 shrink-0" />
                  <span>
                    Estimated cost ₹{X.toLocaleString('en-IN')}. Remaining ₹{Y.toLocaleString('en-IN')} of ₹50,000 → ₹{Z.toLocaleString('en-IN')} after approval
                  </span>
                </div>

                {isNegative && (
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-rose-200 text-rose-900 shrink-0">
                    Deficit Risk
                  </span>
                )}
                {isBelow20Percent && !isNegative && (
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-amber-200 text-amber-900 shrink-0">
                    Low Balance (&lt;20%)
                  </span>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="text-[11px] text-slate-500">
                  Select a review decision to update status and notify club lead:
                </div>

                <div className="flex items-center gap-2">
                  {/* Approve Button */}
                  <button
                    type="button"
                    onClick={() => handleApproveClick(ev)}
                    disabled={submittingId === ev.id}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <span>✓ Approve</span>
                  </button>

                  {/* Reject Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isActionOpen && activeAction?.type === 'REJECT') {
                        setActiveAction(null);
                      } else {
                        setActiveAction({ eventId: ev.id, type: 'REJECT' });
                        setCommentText('');
                      }
                    }}
                    disabled={submittingId === ev.id}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                      isActionOpen && activeAction?.type === 'REJECT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    }`}
                  >
                    <span>✕ Reject</span>
                  </button>

                  {/* Request Reschedule Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isActionOpen && activeAction?.type === 'RESCHEDULE_REQUESTED') {
                        setActiveAction(null);
                      } else {
                        setActiveAction({ eventId: ev.id, type: 'RESCHEDULE_REQUESTED' });
                        setCommentText('');
                      }
                    }}
                    disabled={submittingId === ev.id}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                      isActionOpen && activeAction?.type === 'RESCHEDULE_REQUESTED'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    <span>⏱ Request reschedule</span>
                  </button>
                </div>
              </div>

              {/* Required Comment Box for Reject and Reschedule */}
              {isActionOpen && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 transition-all">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      {activeAction.type === 'REJECT'
                        ? 'Rejection Rationale & Feedback (Required):'
                        : 'Reschedule Guidance & Recommended Windows (Required):'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveAction(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                    >
                      Cancel
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={
                      activeAction.type === 'REJECT'
                        ? 'Explain why this proposal is rejected (e.g. policy clash, duplicate event, out of scope)...'
                        : 'Suggest alternative time slots, dates, or venues for the organizing club to adjust...'
                    }
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-normal"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveAction(null)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!commentText.trim() || submittingId === ev.id}
                      onClick={() => handleCommentSubmit(ev.id, activeAction.type)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg text-white shadow-sm transition disabled:opacity-50 ${
                        activeAction.type === 'REJECT'
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-amber-600 hover:bg-amber-700'
                      }`}
                    >
                      {submittingId === ev.id
                        ? 'Saving...'
                        : activeAction.type === 'REJECT'
                        ? 'Confirm Rejection'
                        : 'Submit Reschedule Request'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal for "Approve despite conflict?" */}
      {conflictApprovalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangleIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Approve despite conflict?</h4>
                <p className="text-xs text-slate-500">
                  This proposal has flagged scheduling overlaps.
                </p>
              </div>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl space-y-2 text-xs text-amber-950">
              <p className="font-semibold text-amber-900">
                Proposal: <span className="underline">{conflictApprovalTarget.title}</span>
              </p>
              <ul className="list-disc pl-4 space-y-1">
                {(conflictApprovalTarget.flags || conflictApprovalTarget.conflictFlags || []).map(
                  (f: string, i: number) => (
                    <li key={i}>{f}</li>
                  )
                )}
              </ul>
              <p className="text-[11px] text-amber-800 pt-1">
                As ACM Core, you can approve this event if you have coordinated with the respective organizers.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConflictApprovalTarget(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingId === conflictApprovalTarget.id}
                onClick={() => submitReview(conflictApprovalTarget.id, 'APPROVE')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition disabled:opacity-50"
              >
                {submittingId === conflictApprovalTarget.id ? 'Approving...' : 'Approve despite conflict?'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
