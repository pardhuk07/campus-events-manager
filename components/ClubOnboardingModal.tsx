'use client';

import React, { useState, useMemo } from 'react';
import { CAMPUS_CLUBS, CampusClub, UserRole } from '@/lib/constants';
import { AuthUser } from './Navbar';

interface ClubOnboardingModalProps {
  isOpen: boolean;
  currentUser: AuthUser | null;
  onClose: () => void;
  onSuccess: (updatedUser: AuthUser) => void;
}

export default function ClubOnboardingModal({
  isOpen,
  currentUser,
  onClose,
  onSuccess,
}: ClubOnboardingModalProps) {
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const filteredClubs = useMemo(() => {
    if (!searchQuery.trim()) return CAMPUS_CLUBS;
    const q = searchQuery.toLowerCase().trim();
    return CAMPUS_CLUBS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (currentUser?.email) {
      localStorage.setItem(`acm_club_onboarding_answered_${currentUser.email}`, 'true');
    }
    onClose();
  };

  const handleConfirmPromotion = async () => {
    if (!selectedClubId) {
      setErrorMessage('Please select a club from the list below.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/promote-executive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: selectedClubId,
          email: currentUser?.email,
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.user) {
        const updatedUser: AuthUser = json.data.user;
        localStorage.setItem('acm_auth_user', JSON.stringify(updatedUser));
        if (currentUser?.email) {
          localStorage.setItem(`acm_club_onboarding_answered_${currentUser.email}`, 'true');
        }
        onSuccess(updatedUser);
        onClose();
      } else {
        setErrorMessage(json.error?.message || 'Failed to update club role. Please try again.');
      }
    } catch (err: any) {
      console.error('Error promoting user:', err);
      setErrorMessage('Network connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-lg font-black shadow-md shrink-0">
                🏛️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Which club are you from?
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                    Executive Onboarding
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose your club from our campus list to become a <strong>Club Executive</strong> with event planning & proposal submission rights.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Search Clubs Filter */}
          <div className="mt-4 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search club name or category (e.g. ACM, ChES, GDGC, Drishti...)"
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>
        </div>

        {/* Club List Selection */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-2 flex-1">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2 rounded-xl mb-3 font-medium">
              ⚠️ {errorMessage}
            </div>
          )}

          {filteredClubs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No campus clubs found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredClubs.map((club: CampusClub) => {
                const isSelected = selectedClubId === club.id;
                return (
                  <div
                    key={club.id}
                    onClick={() => {
                      setSelectedClubId(club.id);
                      setErrorMessage('');
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 text-left relative ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Club Avatar / Logo */}
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 p-1">
                      {club.logoUrl ? (
                        <img
                          src={club.logoUrl}
                          alt={club.shortName}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-xs font-bold text-indigo-600">
                          {club.shortName.slice(0, 3)}
                        </span>
                      )}
                    </div>

                    {/* Club Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {club.shortName}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                          {club.category.split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {club.name}
                      </p>
                    </div>

                    {/* Selection Checkmark */}
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <span className="text-[9px] font-bold">✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-2 rounded-xl transition cursor-pointer text-center"
          >
            I do not belong to any club (Continue as Student)
          </button>

          <button
            type="button"
            onClick={handleConfirmPromotion}
            disabled={!selectedClubId || isSubmitting}
            className="w-full sm:w-auto btn-primary-gradient disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Promoting Account...</span>
              </>
            ) : (
              <span>Confirm & Become Club Executive →</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
