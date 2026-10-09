'use client';

import React, { useState, useEffect } from 'react';
import Navbar, { AuthUser } from '../components/Navbar';
import EventManager from '../components/EventManager';
import ExpenseManager from '../components/ExpenseManager';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'events' | 'expenses'>('events');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Restore authenticated session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('acm_auth_user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Default initial session for quick review
      setCurrentUser({
        id: 'default-core',
        name: 'ACM Core Lead',
        email: 'acmcore@gmail.com',
        role: 'ACM_CORE',
      });
    }
  }, []);

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('acm_auth_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('acm_auth_user');
  };

  const effectiveRole = currentUser?.role || 'MEMBER';

  return (
    <div className="min-h-screen bg-[var(--bg-navy-base)] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'events' ? (
          <EventManager currentRole={effectiveRole} />
        ) : (
          <ExpenseManager currentRole={effectiveRole} />
        )}
      </main>

      <footer className="border-t border-[var(--border-navy)] py-6 text-center text-xs text-slate-500">
        ACM Student Chapter • Campus Conflict-Aware Events & Fund Management System
      </footer>
    </div>
  );
}
