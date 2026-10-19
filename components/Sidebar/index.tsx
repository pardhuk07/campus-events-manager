"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Calendar,
  AlertTriangle,
  Receipt,
  PiggyBank,
  BarChart3,
  Zap,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["MEMBER", "CLUB_EXEC", "CORE_VERIFIER"],
  },
  {
    label: "Events",
    href: "/events",
    icon: Calendar,
    roles: ["MEMBER", "CLUB_EXEC", "CORE_VERIFIER"],
  },
  {
    label: "Conflicts",
    href: "/conflicts",
    icon: AlertTriangle,
    roles: ["CORE_VERIFIER"],
  },
  {
    label: "Expenses",
    href: "/expenses",
    icon: Receipt,
    roles: ["CLUB_EXEC", "CORE_VERIFIER"],
  },
  {
    label: "Budgets",
    href: "/budgets",
    icon: PiggyBank,
    roles: ["CORE_VERIFIER"],
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["CORE_VERIFIER"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role ?? "MEMBER";

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-slate-900/95 border-r border-slate-700/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30 shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">ACM NIT Surat</p>
          <p className="text-[10px] text-slate-500 leading-tight">Event Manager</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-3 h-3 text-blue-400 opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer branding */}
      <div className="px-5 py-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
        <span>ACM NIT Surat</span>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
          Portal
        </span>
      </div>
    </aside>
  );
}
