'use client';

import React, { useState, useEffect } from 'react';
import Navbar, { AuthUser } from '../components/Navbar';
import DashboardView from '../components/DashboardView';
import EventManager from '../components/EventManager';
import ExpenseManager from '../components/ExpenseManager';
import HistoryView from '../components/HistoryView';
import { UserRole } from '@/lib/constants';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'events' | 'expenses' | 'history'>('events');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [eventViewMode, setEventViewMode] = useState<'calendar' | 'timeline' | 'clashes' | 'list' | 'reviews'>('calendar');
  const [targetEventId, setTargetEventId] = useState<string | undefined>();

  const effectiveRole = currentUser?.role || 'MEMBER';

  const handleNavigateTab = (
    tab: 'events' | 'expenses' | 'history',
    viewMode?: string,
    eventId?: string
  ) => {
    setActiveTab(tab);
    if (viewMode && tab === 'events') {
      setEventViewMode(viewMode as any);
    }
    if (eventId) {
      setTargetEventId(eventId);
    }
  };

  const handleOpenPendingReview = (eventId?: string) => {
    setActiveTab('events');
    setEventViewMode('reviews');
    setTargetEventId(eventId);
  };

  // Sync tab with URL search params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['dashboard', 'events', 'expenses', 'history'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
      const viewParam = params.get('view');
      if (viewParam) setEventViewMode(viewParam as any);
      const eventIdParam = params.get('eventId');
      if (eventIdParam) setTargetEventId(eventIdParam);
    }
  }, []);

  // Check saved session on mount & sync with server cookie
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.user) {
          const user = data.data.user;
          setCurrentUser(user);
          localStorage.setItem('acm_auth_user', JSON.stringify(user));
          const params = new URLSearchParams(window.location.search);
          if (!params.get('tab')) {
            setActiveTab(user.role === UserRole.CORE_VERIFIER ? 'dashboard' : 'events');
          }
        } else {
          const saved = localStorage.getItem('acm_auth_user');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setCurrentUser(parsed);
              const params = new URLSearchParams(window.location.search);
              if (!params.get('tab')) {
                setActiveTab(parsed.role === UserRole.CORE_VERIFIER ? 'dashboard' : 'events');
              }
            } catch (e) {
              console.error(e);
              setCurrentUser(null);
            }
          } else {
            setCurrentUser(null);
          }
        }
      })
      .catch(() => {
        setCurrentUser(null);
      });
  }, []);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('acm_auth_user', JSON.stringify(user));
    setActiveTab(user.role === UserRole.CORE_VERIFIER ? 'dashboard' : 'events');
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(console.error);
    setCurrentUser(null);
    localStorage.removeItem('acm_auth_user');
    window.location.href = '/login';
  };

  // Restrict tabs: Only Core Verifier can access dashboard; regular members cannot access budget
  useEffect(() => {
    if (effectiveRole !== UserRole.CORE_VERIFIER && activeTab === 'dashboard') {
      setActiveTab('events');
    }
    if (effectiveRole === UserRole.MEMBER && activeTab === 'expenses') {
      setActiveTab('events');
    }
  }, [effectiveRole, activeTab]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-cyan-100 selection:text-cyan-900">

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogin={handleLoginSuccess}
        onLogout={handleLogout}
        onOpenPendingReview={handleOpenPendingReview}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Keep-Alive Tab Rendering for Instantaneous (<5ms) Tab Switching */}
        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <DashboardView currentUser={currentUser} onNavigateTab={handleNavigateTab} />
        </div>

        <div className={activeTab === 'events' ? 'block' : 'hidden'}>
          <EventManager
            currentRole={effectiveRole}
            currentUser={currentUser}
            initialViewMode={eventViewMode}
            highlightEventId={targetEventId}
          />
        </div>

        {effectiveRole !== 'MEMBER' && (
          <div className={activeTab === 'expenses' ? 'block' : 'hidden'}>
            <ExpenseManager currentRole={effectiveRole} currentUser={currentUser} />
          </div>
        )}

        <div className={activeTab === 'history' ? 'block' : 'hidden'}>
          <HistoryView currentRole={effectiveRole} currentUser={currentUser} />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 font-medium">
        ACM Student Chapter • Campus Conflict-Aware Events & Fund Management System
      </footer>
    </div>
  );
}
