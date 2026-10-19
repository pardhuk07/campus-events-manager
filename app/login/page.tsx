'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    urlError
      ? urlError === 'GoogleAuthFailed' || urlError === 'OAuthFailed'
        ? 'Google sign-in could not be completed. Please use demo credentials or verify Google OAuth settings.'
        : `Sign in error: ${urlError}`
      : ''
  );
  const [successMessage, setSuccessMessage] = useState('');

  const selectDemoUser = (userEmail: string, roleName: string) => {
    setEmail(userEmail);
    setPassword('password123');
    setErrorMessage('');
    setSuccessMessage(`Auto-filled ${roleName} credentials. Click "Sign In" below.`);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success && data.data?.user) {
        setSuccessMessage(`✓ Verified as ${data.data.user.name || data.data.user.role}! Redirecting...`);
        localStorage.setItem('acm_auth_user', JSON.stringify(data.data.user));
        setTimeout(() => {
          window.location.href = callbackUrl;
        }, 400);
      } else {
        setErrorMessage(data.error?.message || 'Invalid email or password. Try demo credentials below.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage('Failed to connect to authentication server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    setErrorMessage('');
    window.location.href = `/api/auth/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-100 selection:text-cyan-900">
      {/* Background ambient accent glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-violet-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-[400px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Brand Header with Violet-to-Cyan Gradient Accent */}
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center p-1 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 mb-3 shadow-md hover:scale-105 transition-transform duration-200"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl p-1.5 flex items-center justify-center">
              <img
                src="/acm-logo.png"
                alt="ACM NIT Surat Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </Link>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-violet-700 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              ACM NIT Surat
            </h1>
            <span className="text-[10px] font-semibold bg-violet-50 text-indigo-700 border border-violet-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Portal
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
            Conflict-Aware Scheduling & Campus Manager
          </p>
        </div>

        {/* Clean Light-Theme Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 relative">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Sign in</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Institutional account & Google verification
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full">
              Single Sign-On
            </span>
          </div>

          {/* Google Sign In Button */}
          <button
            id="google-login-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full bg-white hover:bg-slate-50 disabled:opacity-75 text-slate-700 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-xs border border-slate-300 hover:border-slate-400 cursor-pointer active:scale-[0.99] mb-4 text-xs sm:text-sm"
          >
            {googleLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin text-slate-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider text-[10px]">
                Or with verified email
              </span>
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleCredentialsSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Email address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@student.nit.ac.in"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Demo: password123</span>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2 text-xs text-rose-700 flex items-start gap-2 font-medium">
                <span className="text-rose-500 font-bold shrink-0">!</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-xs text-emerald-700 flex items-start gap-2 font-medium">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading || googleLoading}
              className="w-full btn-primary-gradient disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-md text-xs sm:text-sm cursor-pointer mt-1"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Verifying credentials...</span>
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          {/* Quick 1-Click Demo Accounts */}
          <div className="mt-5 pt-4 border-t border-slate-200">
            <p className="text-[11px] text-slate-500 text-center mb-2 font-semibold uppercase tracking-wider">
              ⚡ Quick 1-Click Demo Logins
            </p>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => selectDemoUser('pardhu120907@gmail.com', 'ACM Core Verifier')}
                className="w-full flex items-center justify-between bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200 rounded-xl px-3 py-2 text-left transition text-xs group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm">👑</span>
                  <div className="min-w-0">
                    <div className="text-purple-900 font-bold truncate">ACM Core Verifier</div>
                    <div className="text-[10px] text-purple-600 font-mono truncate">pardhu120907@gmail.com</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-purple-700 bg-white border border-purple-200 px-2 py-0.5 rounded-md shrink-0">
                  Auto-fill
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectDemoUser('acmexec@gmail.com', 'Club Executive')}
                className="w-full flex items-center justify-between bg-cyan-50/70 hover:bg-cyan-100/70 border border-cyan-200 rounded-xl px-3 py-2 text-left transition text-xs group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm">⚡</span>
                  <div className="min-w-0">
                    <div className="text-cyan-900 font-bold truncate">Club Executive (ACM)</div>
                    <div className="text-[10px] text-cyan-700 font-mono truncate">acmexec@gmail.com</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-cyan-800 bg-white border border-cyan-200 px-2 py-0.5 rounded-md shrink-0">
                  Auto-fill
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectDemoUser('student@gmail.com', 'General Member')}
                className="w-full flex items-center justify-between bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200 rounded-xl px-3 py-2 text-left transition text-xs group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm">👤</span>
                  <div className="min-w-0">
                    <div className="text-slate-800 font-bold truncate">General Student / Member</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">student@gmail.com</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                  Auto-fill
                </span>
              </button>
            </div>
          </div>

          {/* Footer Navigation Link */}
          <div className="mt-5 text-center">
            <Link
              id="back-to-events-link"
              href="/?tab=events"
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition inline-flex items-center gap-1.5"
            >
              <span>← Back to Campus Events Manager</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-400">
          <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
