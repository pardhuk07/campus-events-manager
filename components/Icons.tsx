import React from 'react';

export const CalendarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const RupeeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 3h12M6 8h12m-6 0a4 4 0 0 0 0-8M6 8h4a4 4 0 0 1 4 4c0 2-1.5 3.5-4 4H6l7 7"/>
  </svg>
);

export const AlertTriangleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <line x1="12" y1="9" x2="12" y2="13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ShieldCheckIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 12 2 2 4-4"/>
  </svg>
);

export const PlusCircleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="8" x2="12" y2="16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="8" y1="12" x2="16" y2="12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ReceiptIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8m-8 4h8m-8 4h5"/>
  </svg>
);

export const TrendingUpIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="17 6 23 6 23 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const DownloadIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="15" x2="12" y2="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ClockIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MapPinIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const UsersIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export const BellIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"/>
  </svg>
);

