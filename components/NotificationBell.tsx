'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BellIcon, AlertTriangleIcon, ShieldCheckIcon } from './Icons';
import { UserRole } from '@/lib/constants';

interface NotificationBellProps {
  currentRole: string;
  onOpenPendingReview?: (eventId?: string) => void;
}

export default function NotificationBell({
  currentRole,
  onOpenPendingReview,
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isCore = currentRole === UserRole.CORE_VERIFIER || currentRole === 'ACM_CORE';

  // Format relative time helper
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date().getTime();
      const past = new Date(dateStr).getTime();
      const diffMs = now - past;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDay === 1) return 'Yesterday';
      return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const fetchNotifications = async () => {
    if (!isCore) return;
    try {
      const res = await fetch(`/api/notifications?userRole=${encodeURIComponent(currentRole)}`, {
        headers: { 'x-user-role': currentRole },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  // Initial fetch and 30-second recurring background poll without page reload
  useEffect(() => {
    if (!isCore) return;

    fetchNotifications();

    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [currentRole, isCore]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({ id, userRole: currentRole }),
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({ all: true, userRole: currentRole }),
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleOpenEvent = async (notif: any) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    if (onOpenPendingReview) {
      onOpenPendingReview(notif.eventId);
    }
  };

  // Visible to ACM Core only
  if (!isCore) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-slate-200"
        title="ACM Core Notifications"
        aria-label="ACM Core Notifications"
      >
        <BellIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-700" />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-rose-600 rounded-full border-2 border-white shadow-xs animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 text-slate-900 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Dropdown Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List (Newest First) */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                <div className="text-2xl mb-1">🔔</div>
                No notifications logged yet.
              </div>
            ) : (
              notifications.map((item) => {
                const isHigh = item.priority === 'HIGH' || item.type?.includes('CONFLICT');

                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenEvent(item)}
                    className={`p-3.5 transition cursor-pointer flex items-start gap-3 relative ${
                      !item.isRead
                        ? 'bg-indigo-50/70 border-l-4 border-indigo-600 hover:bg-indigo-100/60'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Icon based on priority/type */}
                    <div className="shrink-0 mt-0.5">
                      {isHigh ? (
                        <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center text-xs">
                          ⚠️
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-600 flex items-center justify-center text-xs">
                          📝
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p
                        className={`text-xs leading-snug line-clamp-2 ${
                          !item.isRead ? 'font-bold text-slate-900' : 'text-slate-700 font-medium'
                        }`}
                      >
                        {item.message}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{formatTimeAgo(item.createdAt)}</span>
                        <span>•</span>
                        <span className="text-indigo-600 font-bold hover:underline">
                          View in Pending Review →
                        </span>
                      </div>
                    </div>

                    {/* Actions: Mark as Read */}
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="shrink-0 text-[10px] font-bold text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-white transition"
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
            <span>ACM Core Command Center • Auto-refreshes every 30s</span>
          </div>
        </div>
      )}
    </div>
  );
}
