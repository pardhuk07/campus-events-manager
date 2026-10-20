'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { CalendarIcon, RupeeIcon, ShieldCheckIcon, TrendingUpIcon } from './Icons';
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
  activeTab: 'dashboard' | 'events' | 'expenses' | 'history';
  setActiveTab: (tab: 'dashboard' | 'events' | 'expenses' | 'history') => void;
  currentUser: AuthUser | null;
  onLogin: (user: AuthUser) => void;
  onLogout: () => void;
  onOpenPendingReview?: (eventId?: string) => void;
  onOpenClubModal?: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  onLogin,
  onLogout,
  onOpenPendingReview,
  onOpenClubModal,
}: NavbarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
      }
    }

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showProfileMenu]);

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
              {currentUser && currentUser.role === UserRole.CORE_VERIFIER && (
                <button
                  id="nav-tab-dashboard"
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-200 ${
                    activeTab === 'dashboard'
                      ? 'tab-active-gradient'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <TrendingUpIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                  <span>Dashboard</span>
                </button>
              )}

              <button
                id="nav-tab-events"
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

            {/* User Account / Role Verification State with Interactive Dropdown */}
            {currentUser ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  id="user-profile-menu-button"
                  type="button"
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className="flex items-center gap-2 sm:gap-2.5 bg-white hover:bg-slate-50 pl-2 sm:pl-3 pr-2 py-1 sm:py-1.5 rounded-xl border border-slate-200 shadow-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  aria-expanded={showProfileMenu}
                  aria-haspopup="true"
                >
                  {/* Avatar Initial Circle with Active Status Dot */}
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-[11px] sm:text-xs font-bold shadow-sm">
                      {currentUser.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>

                  {/* Name and Role Label */}
                  <div className="text-left hidden xs:block">
                    <div className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight truncate max-w-[90px] sm:max-w-[130px]">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] font-semibold text-indigo-600 leading-tight">
                      {currentUser.role === UserRole.CORE_VERIFIER
                        ? 'ACM Core Verifier'
                        : currentUser.role === UserRole.CLUB_EXEC
                        ? (CAMPUS_CLUBS.find((c) => c.id === currentUser.clubId)?.shortName || 'Club Exec')
                        : 'Public Member'}
                    </div>
                  </div>

                  {/* Role Pill Badge */}
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
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
                          <span className="inline-flex items-center gap-1">
                            {club?.logoUrl && (
                              <img
                                src={club.logoUrl}
                                alt={club.shortName}
                                className="w-3 h-3 object-contain rounded-full inline-block"
                              />
                            )}
                            <span>{club?.shortName || 'Exec'}</span>
                          </span>
                        );
                      })()
                    ) : (
                      '👤 Public'
                    )}
                  </span>

                  {/* Chevron Toggle */}
                  <svg
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      showProfileMenu ? 'rotate-180 text-indigo-600' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu Popover */}
                {showProfileMenu && (
                  <div
                    id="user-profile-dropdown"
                    className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* User Info Header */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-1">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                          {currentUser.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {currentUser.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {currentUser.email}
                          </p>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <span>🛡️</span>
                        <span>
                          {currentUser.role === UserRole.CORE_VERIFIER
                            ? 'ACM Core Verifier'
                            : currentUser.role === UserRole.CLUB_EXEC
                            ? 'Club Executive'
                            : 'Public Student Member'}
                        </span>
                      </div>
                    </div>

                    {currentUser.role === UserRole.MEMBER && onOpenClubModal && (
                      <button
                        id="user-promote-exec-btn"
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          onOpenClubModal();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-50 border border-indigo-100 transition text-left cursor-pointer my-1.5 shadow-2xs"
                      >
                        <span className="text-sm">⚡</span>
                        <span>Register as Club Executive</span>
                      </button>
                    )}

                    <div className="h-px bg-slate-100 my-1" />

                    {/* Log out / Switch Persona Button */}
                    <button
                      id="user-logout-button"
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition text-left cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                id="nav-login-link"
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 btn-primary-gradient text-white text-xs font-semibold rounded-xl shadow-md transition shrink-0"
              >
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
