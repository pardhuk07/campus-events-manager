'use client';

import React, { useState } from 'react';
import { ShieldCheckIcon } from './Icons';
import { AuthUser } from './Navbar';

interface GatekeeperModalProps {
  isOpen: boolean;
  onSelectPublic: () => void;
  onLoginSuccess: (user: AuthUser) => void;
}

export default function GatekeeperModal({
  isOpen,
  onSelectPublic,
  onLoginSuccess,
}: GatekeeperModalProps) {
  // Step: 'select_role' | 'enter_credentials'
  const [step, setStep] = useState<'select_role' | 'enter_credentials'>('select_role');
  const [selectedRole, setSelectedRole] = useState<'ACM_CORE' | 'CLUB_EXEC'>('ACM_CORE');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleRoleChosen = (role: 'ACM_CORE' | 'CLUB_EXEC' | 'PUBLIC') => {
    if (role === 'PUBLIC') {
      onSelectPublic();
      return;
    }
    setSelectedRole(role);
    setErrorMessage('');
    setSuccessMessage('');
    // Auto-fill Pardhu's email if core selected for fast access
    if (role === 'ACM_CORE') {
      setEmail('pardhu120907@gmail.com');
      setPassword('password123');
    } else {
      setEmail('acmexec@gmail.com');
      setPassword('password123');
    }
    setStep('enter_credentials');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, selectedRole }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setSuccessMessage(`✓ Verified! Welcome, ${data.user.name} (${data.user.role})`);
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 600);
      } else {
        setErrorMessage(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Unable to reach authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b1328] border border-[var(--border-navy-light)] rounded-3xl max-w-lg w-full p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-violet-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#101b37] border border-[var(--border-navy-light)] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg p-2">
            <img src="/acm-logo.png" alt="ACM NIT Surat" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            ACM NIT Surat
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Campus Events & Fund Management System
          </p>
        </div>

        {/* STEP 1: SELECT PERSONA */}
        {step === 'select_role' ? (
          <div className="space-y-4">
            <p className="text-xs text-center text-slate-300 font-semibold uppercase tracking-wider mb-2">
              Who are you accessing this portal as?
            </p>

            <div className="grid grid-cols-1 gap-3">
              {/* Option 1: ACM Core Member */}
              <button
                type="button"
                onClick={() => handleRoleChosen('ACM_CORE')}
                className="group p-4 rounded-2xl bg-[#060b18] border border-[var(--border-navy)] hover:border-violet-500/80 transition-all text-left flex items-center justify-between shadow-sm hover:shadow-violet-500/10"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center font-bold text-lg">
                    👑
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-violet-300 transition">
                      ACM Core Member
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Super Admin • Budget override & clash approvals
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-bold group-hover:translate-x-1 transition">→</span>
              </button>

              {/* Option 2: Club Executive */}
              <button
                type="button"
                onClick={() => handleRoleChosen('CLUB_EXEC')}
                className="group p-4 rounded-2xl bg-[#060b18] border border-[var(--border-navy)] hover:border-cyan-500/80 transition-all text-left flex items-center justify-between shadow-sm hover:shadow-cyan-500/10"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold text-lg">
                    🛡️
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-cyan-300 transition">
                      Club Executive
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Club Lead / Treasurer • Submit events & upload receipts
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-bold group-hover:translate-x-1 transition">→</span>
              </button>

              {/* Option 3: Public Person (No Login Required) */}
              <button
                type="button"
                onClick={() => handleRoleChosen('PUBLIC')}
                className="group p-4 rounded-2xl bg-[#101b37]/60 border border-[var(--border-navy-light)] hover:border-slate-500 transition-all text-left flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-lg">
                    👤
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-slate-200 transition">
                      Public Person / Student
                    </div>
                    <div className="text-[11px] text-emerald-400 font-medium">
                      No Login Required • Instant View Access
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                  Enter Direct →
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: CREDENTIALS INPUT */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-navy)]">
              <div className="flex items-center gap-2">
                <span className="text-base">{selectedRole === 'ACM_CORE' ? '👑' : '🛡️'}</span>
                <span className="font-bold text-sm text-white">
                  {selectedRole === 'ACM_CORE' ? 'ACM Core Authentication' : 'Club Executive Authentication'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep('select_role')}
                className="text-xs text-slate-400 hover:text-white underline font-semibold"
              >
                ← Back
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-xl">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-xl font-bold animate-pulse">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Gmail / Authorized Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pardhu120907@gmail.com"
                  className="w-full bg-[#060b18] border border-[var(--border-navy)] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password / Passcode
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#060b18] border border-[var(--border-navy)] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Demo Passcode: <span className="font-mono text-cyan-300 font-bold">password123</span> or <span className="font-mono text-cyan-300 font-bold">acm123</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary-gradient disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg mt-2"
              >
                {loading ? 'Verifying with Database...' : 'Confirm & Access System'}
              </button>
            </form>

            {/* Quick Helper for Pardhu */}
            {selectedRole === 'ACM_CORE' && (
              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-200">
                ⭐ <strong className="text-white">Pre-authorized Core Lead:</strong> pardhu120907@gmail.com
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
