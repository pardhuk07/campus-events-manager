'use client';

import React, { useState } from 'react';
import { CalendarIcon, RupeeIcon, ShieldCheckIcon } from './Icons';

export type UserRole = 'MEMBER' | 'CLUB_EXEC' | 'ACM_CORE';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface NavbarProps {
  activeTab: 'events' | 'expenses';
  setActiveTab: (tab: 'events' | 'expenses') => void;
  currentUser: AuthUser | null;
  onLogin: (user: AuthUser) => void;
  onLogout: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  onLogin,
  onLogout,
}: NavbarProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [inputName, setInputName] = useState('');
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
        body: JSON.stringify({ email: inputEmail, name: inputName }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onLogin(data.user);
        setShowLoginModal(false);
        setInputEmail('');
        setInputName('');
      } else {
        setErrorMessage(data.error || 'Verification failed');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to connect to authentication service.');
    } finally {
      setVerifying(false);
    }
  };

  const quickLoginAs = (email: string, name: string) => {
    setInputEmail(email);
    setInputName(name);
  };

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl font-extrabold flex items-center justify-center text-lg shadow-lg tracking-wider">
                ACM
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Campus Manager
                </h1>
                <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Track 2
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Conflict-Aware Scheduling & Digital Fund Memory</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            {/* Navigation Tabs */}
            <nav className="flex p-1 bg-slate-900/90 rounded-xl border border-slate-800 shadow-inner">
              <button
                onClick={() => setActiveTab('events')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'events'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Events</span>
              </button>

              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'expenses'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <RupeeIcon className="w-3.5 h-3.5" />
                <span>Budget</span>
              </button>
            </nav>

            {/* User Account / Role Verification State */}
            {currentUser ? (
              <div className="flex items-center gap-2.5 bg-slate-900/90 pl-3 pr-2 py-1 rounded-xl border border-slate-800 shadow-sm">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-200 leading-tight truncate max-w-[120px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {currentUser.email}
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    currentUser.role === 'ACM_CORE'
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      : currentUser.role === 'CLUB_EXEC'
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {currentUser.role === 'ACM_CORE'
                    ? '👑 Core'
                    : currentUser.role === 'CLUB_EXEC'
                    ? '🛡️ Exec'
                    : '👤 Member'}
                </span>

                <button
                  type="button"
                  onClick={onLogout}
                  className="text-xs text-slate-400 hover:text-red-400 p-1 rounded-lg hover:bg-slate-800 transition"
                  title="Switch Persona / Sign out"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 transition"
              >
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                Verify Gmail
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Gmail Email Verification Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-blue-400" />
                  Email & Role Authentication
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  The system determines permissions based on verified Gmail ID.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white text-base font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mt-3 p-3 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-xl">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleVerifyEmail} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="e.g. Parth Patel"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Gmail / Student Email ID
                </label>
                <input
                  type="email"
                  required
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-lg shadow-blue-500/25 mt-2"
              >
                {verifying ? 'Verifying Credentials...' : 'Sign In & Verify Role'}
              </button>
            </form>

            {/* Quick Demo Pre-Verified Credentials */}
            <div className="mt-5 pt-4 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Test Personas:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => quickLoginAs('acmcore@gmail.com', 'ACM Core Lead')}
                  className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/50 hover:border-purple-500 text-left transition group"
                >
                  <div className="font-bold text-xs text-purple-300 group-hover:text-purple-200">👑 Core Admin</div>
                  <div className="text-[9px] text-slate-400 truncate mt-0.5">acmcore@gmail.com</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickLoginAs('acmexec@gmail.com', 'Club Treasurer')}
                  className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-800/50 hover:border-blue-500 text-left transition group"
                >
                  <div className="font-bold text-xs text-blue-300 group-hover:text-blue-200">🛡️ Executive</div>
                  <div className="text-[9px] text-slate-400 truncate mt-0.5">acmexec@gmail.com</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickLoginAs('student@gmail.com', 'Campus Student')}
                  className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-500 text-left transition group"
                >
                  <div className="font-bold text-xs text-slate-300 group-hover:text-white">👤 Member</div>
                  <div className="text-[9px] text-slate-400 truncate mt-0.5">student@gmail.com</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
