"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Bell,
  ChevronDown,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/events": "Events",
  "/events/create": "Create Event",
  "/conflicts": "Conflicts",
  "/expenses": "Expenses",
  "/expenses/create": "Add Expense",
  "/budgets": "Budgets",
  "/analytics": "Analytics",
};

const roleLabels: Record<string, string> = {
  CORE_VERIFIER: "ACM Core Verifier",
  CLUB_EXEC: "Club Executive",
  MEMBER: "ACM Member",
};

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const title = pageTitles[pathname] ?? "ACM Manager";

  const userRole = (session?.user as any)?.role ?? "CORE_VERIFIER";
  const roleTitle = roleLabels[userRole] ?? "ACM Core Verifier";
  const userName = session?.user?.name || "ACM Core Verifier";
  const userEmail = session?.user?.email || "verifier@acmnitsurat.ac.in";
  const userInitial = userName[0]?.toUpperCase() ?? "V";

  // Close dropdown on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <header className="h-16 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <h1 className="text-base font-semibold text-white">{title}</h1>
        <p className="text-[11px] text-slate-500 mt-0.5">ACM NIT Surat</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell placeholder */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {/* User profile dropdown button at top-right */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="user-profile-menu-button"
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-700/60 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600/80 transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 border border-blue-400/30 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-500/20">
                {userInitial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>

            {/* User name & role label */}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-200 leading-tight">
                {userName}
              </span>
              <span className="text-[10px] font-medium text-blue-400 leading-tight flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-400 shrink-0" />
                {roleTitle}
              </span>
            </div>

            {/* Chevron toggle */}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-blue-400" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div
              id="user-profile-dropdown"
              className="absolute right-0 top-full mt-2 w-64 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* User info banner */}
              <div className="px-3 py-2.5 mb-1 bg-slate-800/50 rounded-xl border border-slate-700/40">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 border border-blue-400/40 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {userInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate leading-tight">
                      {userName}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                      {userEmail}
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                  <span>{roleTitle}</span>
                </div>
              </div>

              {/* Quick link */}
              <div className="py-1">
                <Link
                  id="user-dropdown-dashboard-link"
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                  Dashboard
                </Link>
              </div>

              <div className="h-px bg-slate-800 my-1" />

              {/* Log out option */}
              <button
                id="user-logout-button"
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition-all text-left cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

