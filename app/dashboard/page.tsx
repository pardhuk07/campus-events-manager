'use client';

import React, { useState, useEffect } from 'react';
import Navbar, { AuthUser } from '@/components/Navbar';
import DashboardView from '@/components/DashboardView';
import { useRouter } from 'next/navigation';

import { UserRole } from '@/lib/constants';

export default function DashboardRoutePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Check saved session on mount & sync with server cookie
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.user) {
          const user = data.data.user;
          if (user.role !== UserRole.CORE_VERIFIER) {
            router.replace('/?tab=events');
            return;
          }
          setCurrentUser(user);
          localStorage.setItem('acm_auth_user', JSON.stringify(user));
        } else {
          const saved = localStorage.getItem('acm_auth_user');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.role !== UserRole.CORE_VERIFIER) {
                router.replace('/?tab=events');
                return;
              }
              setCurrentUser(parsed);
            } catch (e) {
              console.error(e);
              router.replace('/?tab=events');
            }
          } else {
            router.replace('/?tab=events');
          }
        }
      })
      .catch(() => {
        router.replace('/?tab=events');
      });
  }, [router]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('acm_auth_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(console.error);
    setCurrentUser(null);
    localStorage.removeItem('acm_auth_user');
    window.location.href = '/login';
  };

  const handleNavigateTab = (
    tab: 'events' | 'expenses' | 'history',
    viewMode?: string,
    eventId?: string
  ) => {
    // Navigate back to home with desired tab query
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (viewMode) params.set('view', viewMode);
    if (eventId) params.set('eventId', eventId);
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-cyan-100 selection:text-cyan-900">
      <Navbar
        activeTab="dashboard"
        setActiveTab={(tab) => {
          if (tab === 'dashboard') return;
          router.push(`/?tab=${tab}`);
        }}
        currentUser={currentUser}
        onLogin={handleLoginSuccess}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardView currentUser={currentUser} onNavigateTab={handleNavigateTab} />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 font-medium">
        ACM Student Chapter • Campus Conflict-Aware Events & Fund Management System
      </footer>
    </div>
  );
}
