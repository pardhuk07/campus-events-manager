'use client';

import React, { useState } from 'react';
import { ShieldCheckIcon } from './Icons';
import { AuthUser } from './Navbar';
import { UserRole, CAMPUS_CLUBS, CampusClub } from '@/lib/constants';

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
  const [step, setStep] = useState<'select_role' | 'select_club' | 'enter_credentials'>('select_role');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CORE_VERIFIER);
  const [selectedClub, setSelectedClub] = useState<CampusClub>(CAMPUS_CLUBS[0]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleRoleChosen = (role: 'CORE_VERIFIER' | 'CLUB_EXEC' | 'PUBLIC') => {
    if (role === 'PUBLIC') {
      onSelectPublic();
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    if (role === 'CORE_VERIFIER') {
      setSelectedRole(UserRole.CORE_VERIFIER);
      setEmail('pardhu120907@gmail.com');
      setPassword('password123');
      setStep('enter_credentials');
    } else {
      setSelectedRole(UserRole.CLUB_EXEC);
      setStep('select_club');
    }
  };

  const handleClubSelected = (club: CampusClub) => {
    setSelectedClub(club);
    const slug = club.shortName.toLowerCase().replace(/[^a-z0-9]/g, '');
    setEmail(`${slug}exec@gmail.com`);
    setPassword('password123');
    setErrorMessage('');
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
        body: JSON.stringify({
          email,
          password,
          selectedRole,
          clubId: selectedRole === UserRole.CLUB_EXEC ? selectedClub.id : null,
        }),
      });
      const json = await res.json();

      if (json.success && json.data?.user) {
        setSuccessMessage(`✓ Verified! Welcome, ${json.data.user.name} (${json.data.user.role})`);
        setTimeout(() => {
          onLoginSuccess(json.data.user);
        }, 500);
      } else {
        setErrorMessage(json.error?.message || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Unable to reach authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-7 max-h-[92vh] overflow-y-auto text-slate-900 shadow-2xl relative">
        {/* Glow Accent */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md p-1.5 sm:p-2">
            <img src="/acm-logo.png" alt="ACM NIT Surat" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            ACM NIT Surat
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Campus Events & Fund Management System
          </p>
        </div>

        {/* STEP 1: SELECT PERSONA */}
        {step === 'select_role' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <p className="text-xs text-center text-slate-600 font-semibold uppercase tracking-wider mb-2">
              Who are you accessing this portal as?
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: ACM Core Member */}
              <button
                type="button"
                onClick={() => handleRoleChosen('CORE_VERIFIER')}
                className="group p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-violet-500 hover:bg-violet-50/30 transition-all text-left flex items-center justify-between shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center font-bold text-lg shrink-0">
                    👑
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-violet-700 transition">
                      ACM Core Member (CORE_VERIFIER)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Super Admin • Full approval, clash review & budget oversight
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-bold group-hover:translate-x-1 group-hover:text-violet-600 transition">→</span>
              </button>

              {/* Option 2: Club Executive */}
              <button
                type="button"
                onClick={() => handleRoleChosen('CLUB_EXEC')}
                className="group p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left flex items-center justify-between shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 border border-cyan-200 text-cyan-800 flex items-center justify-center font-bold text-lg shrink-0">
                    🛡️
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-cyan-800 transition">
                      Club Executive (CLUB_EXEC)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Society Lead • Propose events & submit expenses for your club
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-bold group-hover:translate-x-1 group-hover:text-cyan-600 transition">→</span>
              </button>

              {/* Option 3: Public Person */}
              <button
                type="button"
                onClick={() => handleRoleChosen('PUBLIC')}
                className="group p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left flex items-center justify-between shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-lg shrink-0">
                    👤
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-slate-800 transition flex items-center gap-2">
                      <span>Public Person / Student (MEMBER)</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                        No Login Required
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Read-only access to approved events and transparent public budget
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-bold group-hover:translate-x-1 group-hover:text-slate-700 transition">→</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SELECT CLUB (For Club Executives) */}
        {step === 'select_club' && (
          <div className="animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>🏢</span> Select Your Campus Club / Society
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select which club you represent. You will only be permitted to create events for this club:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep('select_role')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer shrink-0 ml-2"
              >
                ← Back
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {CAMPUS_CLUBS.map((club) => (
                <button
                  key={club.id}
                  type="button"
                  onClick={() => handleClubSelected(club)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition group shadow-2xs flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                        {club.shortName}
                      </span>
                      <span className="text-[9px] bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                        {club.category}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-600 mt-1 line-clamp-2">
                      {club.name}
                    </div>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-bold mt-2 flex items-center gap-1">
                    Select this Club →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: CREDENTIAL VERIFICATION FORM */}
        {step === 'enter_credentials' && (
          <div className="animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {selectedRole === UserRole.CORE_VERIFIER ? '👑' : '🛡️'}
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {selectedRole === UserRole.CORE_VERIFIER ? 'ACM Core Sign In' : 'Executive Sign In'}
                  </div>
                  {selectedRole === UserRole.CLUB_EXEC && (
                    <div className="text-[11px] font-semibold text-indigo-700">
                      Representing: {selectedClub.name}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(selectedRole === UserRole.CLUB_EXEC ? 'select_club' : 'select_role')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer shrink-0"
              >
                ← {selectedRole === UserRole.CLUB_EXEC ? 'Change Club' : 'Back'}
              </button>
            </div>

            {selectedRole === UserRole.CLUB_EXEC && (
              <div className="mb-3 p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏢</span>
                  <div>
                    <span className="font-bold">{selectedClub.shortName}</span>
                    <span className="text-[11px] text-slate-600 block">
                      Events will be strictly restricted to {selectedClub.name}.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('select_club')}
                  className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer shrink-0 ml-2"
                >
                  Change
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gmail / Official Student Email ID
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. chesexec@gmail.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter demo password: password123"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary-gradient disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheckIcon className="w-4 h-4" />
                <span>{loading ? 'Verifying Credentials...' : 'Sign In & Access Club Portal'}</span>
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>Demo Password:</span>
              <span className="font-mono text-indigo-600 font-semibold">password123</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
