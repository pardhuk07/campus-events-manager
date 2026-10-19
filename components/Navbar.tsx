'use client';

import React, { useState } from 'react';
import { CalendarIcon, RupeeIcon, ShieldCheckIcon } from './Icons';
import NotificationBell from './NotificationBell';
import { UserRole, CAMPUS_CLUBS } from '@/lib/constants';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clubId?: string | null;
}

interface NavbarProps {
  activeTab: 'events' | 'expenses' | 'history';
  setActiveTab: (tab: 'events' | 'expenses' | 'history') => void;
  currentUser: AuthUser | null;
  onLogin: (user: AuthUser) => void;
  onLogout: () => void;
  onOpenPendingReview?: (eventId?: string) => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  onLogin,
  onLogout,
  onOpenPendingReview,
}: NavbarProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('password123');
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail) return;

    setVerifying(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inputEmail, password: inputPassword }),
      });
      const data = await res.json();
      if (data.success && data.data?.user) {
        onLogin(data.data.user);
        setShowLoginModal(false);
        setInputEmail('');
      } else {
        setErrorMessage(data.error?.message || 'Verification failed');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to connect to authentication service.');
    } finally {
      setVerifying(false);
    }
  };

  const quickLoginAs = (email: string) => {
    setInputEmail(email);
    setInputPassword('password123');
  };

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/95 border-b border-slate-200 text-slate-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo & Title with Violet-to-Cyan Accent */}
          <div className="flex items-center space-x-2 sm:space-x-3.5 min-w-0">
            <div className="relative group shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl blur-md opacity-40 group-hover:opacity-75 transition duration-300"></div>
              <div className="relative w-9 h-9 sm:w-12 sm:h-12 bg-white rounded-xl p-1 sm:p-1.5 border border-slate-200 flex items-center justify-center shadow-md">
                <img
                  src="/acm-logo.png"
                  alt="ACM NIT Surat Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-lg font-bold tracking-tight bg-gradient-to-r from-violet-700 via-indigo-600 to-cyan-600 bg-clip-text text-transparent truncate">
                  ACM NIT Surat
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-semibold bg-violet-50 text-indigo-700 border border-violet-200 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Campus Manager
                </span>
              </div>
              <p className="hidden md:block text-xs text-slate-500 font-medium truncate">
                Conflict-Aware Scheduling & Fund Memory
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Navigation Tabs with Violet-to-Cyan Gradient Active State */}
            <nav className="flex p-0.5 sm:p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
              <button
                onClick={() => setActiveTab('events')}
                className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'events'
                    ? 'tab-active-gradient'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <CalendarIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                <span>Events</span>
              </button>

              {currentUser && currentUser.role !== UserRole.MEMBER && (
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-200 ${
                    activeTab === 'expenses'
                      ? 'tab-active-gradient'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <RupeeIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                  <span>Budget</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'history'
                    ? 'tab-active-gradient'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <span className="text-xs">📜</span>
                <span>History</span>
              </button>
            </nav>

            {/* Notification Bell: Visible to ACM Core Only */}
            {currentUser && (currentUser.role === UserRole.CORE_VERIFIER || (currentUser.role as any) === 'ACM_CORE') && (
              <NotificationBell
                currentRole={currentUser.role}
                onOpenPendingReview={onOpenPendingReview}
              />
            )}

            {/* User Account / Role Verification State */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2.5 bg-white pl-2 sm:pl-3 pr-1.5 sm:pr-2 py-1 sm:py-1.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-right">
                  <div className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight truncate max-w-[80px] sm:max-w-[120px]">
                    {currentUser.name}
                  </div>
                  <div className="hidden sm:block text-[10px] text-slate-500 truncate max-w-[120px]">
                    {currentUser.email}
                  </div>
                </div>

                <span
                  className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                    currentUser.role === UserRole.CORE_VERIFIER
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : currentUser.role === UserRole.CLUB_EXEC
                      ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {currentUser.role === UserRole.CORE_VERIFIER ? (
                    '👑 Core'
                  ) : currentUser.role === UserRole.CLUB_EXEC ? (
                    (() => {
                      const club = CAMPUS_CLUBS.find((c) => c.id === currentUser.clubId);
                      return (
                        <span className="inline-flex items-center gap-1.5">
                          {club?.logoUrl ? (
                            <img
                              src={club.logoUrl}
                              alt={club.shortName}
                              className="w-3.5 h-3.5 object-contain rounded-full inline-block"
                            />
                          ) : (
                            <span>🛡️</span>
                          )}
                          <span>{club?.shortName || 'Exec'}</span>
                        </span>
                      );
                    })()
                  ) : (
                    '👤 Public'
                  )}
                </span>

                <button
                  type="button"
                  onClick={onLogout}
                  className="text-xs text-slate-400 hover:text-rose-600 p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 transition shrink-0"
                  title="Switch Persona / Sign out"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 btn-primary-gradient text-white text-[11px] sm:text-xs font-semibold rounded-xl shadow-md transition shrink-0"
              >
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Verify</span> Gmail
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Gmail Email Verification Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
                  Email & Role Authentication
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  The system determines permissions based on verified Gmail ID.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleVerifyEmail} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Gmail / Student Email ID
                </label>
                <input
                  type="email"
                  required
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="password123"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full btn-primary-gradient disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-md mt-2"
              >
                {verifying ? 'Verifying Credentials...' : 'Sign In & Verify Role'}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Quick Test Personas:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => quickLoginAs('pardhu120907@gmail.com')}
                  className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 hover:border-purple-400 text-left transition group shadow-sm"
                >
                  <div className="font-bold text-xs text-purple-700 group-hover:text-purple-900">👑 Core Admin</div>
                  <div className="text-[9px] text-slate-500 truncate mt-0.5">pardhu120907@gmail.com</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickLoginAs('acmexec@gmail.com')}
                  className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 hover:border-cyan-400 text-left transition group shadow-sm"
                >
                  <div className="font-bold text-xs text-cyan-800 group-hover:text-cyan-900">🛡️ Executive</div>
                  <div className="text-[9px] text-slate-500 truncate mt-0.5">acmexec@gmail.com</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickLoginAs('student@gmail.com')}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-400 text-left transition group shadow-sm"
                >
                  <div className="font-bold text-xs text-slate-700 group-hover:text-slate-900">👤 Member</div>
                  <div className="text-[9px] text-slate-500 truncate mt-0.5">student@gmail.com</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
