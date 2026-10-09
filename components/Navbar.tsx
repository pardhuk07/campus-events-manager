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
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg font-bold flex items-center justify-center">
              ACM
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
                Campus Events & Fund Manager
                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                  Track 2
                </span>
              </h1>
              <p className="text-xs text-slate-400">Conflict-Aware Scheduling & Digital Institutional Memory</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            {/* Navigation Tabs */}
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab('events')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'events'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                Events
              </button>

              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'expenses'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <RupeeIcon className="w-3.5 h-3.5" />
                Budget
              </button>
            </nav>

            {/* User Account / Email Verification State */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-800/90 pl-3 pr-2 py-1.5 rounded-lg border border-slate-700">
                <div className="text-right">
                  <div className="text-xs font-semibold text-white leading-none truncate max-w-[130px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                    {currentUser.email}
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    currentUser.role === 'ACM_CORE'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : currentUser.role === 'CLUB_EXEC'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-slate-700 text-slate-300'
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
                  className="text-[11px] text-slate-400 hover:text-red-400 p-1 rounded transition"
                  title="Switch account / Sign out"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition"
              >
                <ShieldCheckIcon className="w-4 h-4" />
                Verify Gmail / Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Gmail Email Verification Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 text-white shadow-2xl animate-in fade-in">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-blue-400" />
                  Email & Role Verification
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  The system assigns permissions based on your verified email address.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mt-3 p-2.5 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-lg">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleVerifyEmail} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Your Name</label>
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="e.g. Parth Patel"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Gmail / Institutional Email
                </label>
                <input
                  type="email"
                  required
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition shadow mt-2"
              >
                {verifying ? 'Verifying Credentials...' : 'Verify Email & Enter'}
              </button>
            </form>

            {/* Quick Demo Accounts for Verification Testing */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Test Credentials (Pre-Verified Roles):
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => quickLoginAs('acmcore@gmail.com', 'ACM Core Lead')}
                  className="p-2 rounded bg-purple-950/40 border border-purple-800/60 hover:border-purple-500 text-purple-200 text-left transition"
                >
                  <div className="font-bold text-[11px]">👑 Core Admin</div>
                  <div className="text-[9px] text-slate-400 truncate">acmcore@gmail.com</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickLoginAs('acmexec@gmail.com', 'Club Treasurer')}
                  className="p-2 rounded bg-blue-950/40 border border-blue-800/60 hover:border-blue-500 text-blue-200 text-left transition"
                >
                  <div className="font-bold text-[11px]">🛡️ Executive</div>
                  <div className="text-[9px] text-slate-400 truncate">acmexec@gmail.com</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickLoginAs('student@gmail.com', 'Campus Student')}
                  className="p-2 rounded bg-slate-800/60 border border-slate-700 hover:border-slate-500 text-slate-200 text-left transition"
                >
                  <div className="font-bold text-[11px]">👤 Member</div>
                  <div className="text-[9px] text-slate-400 truncate">student@gmail.com</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
