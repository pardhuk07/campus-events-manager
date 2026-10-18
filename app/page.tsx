'use client';

import React, { useState, useEffect } from 'react';
import Navbar, { AuthUser } from '../components/Navbar';
import EventManager from '../components/EventManager';
import ExpenseManager from '../components/ExpenseManager';
import HistoryView from '../components/HistoryView';
import GatekeeperModal from '../components/GatekeeperModal';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'events' | 'expenses' | 'history'>('events');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showGatekeeper, setShowGatekeeper] = useState(false);
  const [eventViewMode, setEventViewMode] = useState<'calendar' | 'timeline' | 'clashes' | 'list' | 'reviews'>('calendar');
  const [targetEventId, setTargetEventId] = useState<string | undefined>();

  const handleOpenPendingReview = (eventId?: string) => {
    setActiveTab('events');
    setEventViewMode('reviews');
    setTargetEventId(eventId);
  };

  // Check saved session on mount
  useEffect(() => {
    const saved = localStorage.getItem('acm_auth_user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        console.error(e);
        setShowGatekeeper(true);
      }
    } else {
      setShowGatekeeper(true);
    }
  }, []);

  const handleSelectPublic = () => {
    const publicUser: AuthUser = {
      id: 'guest-public',
      name: 'Public Guest',
      email: 'public@student.nit.ac.in',
      role: 'MEMBER',
    };
    setCurrentUser(publicUser);
    localStorage.setItem('acm_auth_user', JSON.stringify(publicUser));
    setShowGatekeeper(false);
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('acm_auth_user', JSON.stringify(user));
    setShowGatekeeper(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('acm_auth_user');
    setShowGatekeeper(true);
  };

  const effectiveRole = currentUser?.role || 'MEMBER';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-cyan-100 selection:text-cyan-900">
      {/* First-Visit Gatekeeper Modal */}
      <GatekeeperModal
        isOpen={showGatekeeper}
        onSelectPublic={handleSelectPublic}
        onLoginSuccess={handleLoginSuccess}
      />

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
        <div className={activeTab === 'events' ? 'block' : 'hidden'}>
          <EventManager
            currentRole={effectiveRole}
            currentUser={currentUser}
            initialViewMode={eventViewMode}
            highlightEventId={targetEventId}
          />
        </div>

        <div className={activeTab === 'expenses' ? 'block' : 'hidden'}>
          <ExpenseManager currentRole={effectiveRole} currentUser={currentUser} />
        </div>

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
