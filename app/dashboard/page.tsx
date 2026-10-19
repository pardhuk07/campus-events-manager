import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import {
  Calendar,
  Clock,
  AlertTriangle,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";

import { fetchDashboardData } from "@/lib/services/dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  let data = null;
  try {
    data = await fetchDashboardData();
  } catch (err) {
    console.error("[Dashboard Load Error]", err);
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Failed to load dashboard data.</p>
      </div>
    );
  }

  const { stats, upcomingEvents, conflictAlerts, recentExpenses, categoryBreakdown } = data;
  const budgetPct =
    stats.activeBudgetAmount > 0
      ? Math.min(100, Math.round((stats.totalSpent / stats.activeBudgetAmount) * 100))
      : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-white">
          Welcome back, {session.user?.name?.split(" ")[0]} 👋
        </h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Here&apos;s what&apos;s happening with ACM NIT Surat today.
        </p>
      </div>

      {/* ── Conflict Alert Banner ── */}
      {conflictAlerts.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-sm font-semibold text-orange-400">
              {conflictAlerts.length} Active Conflict
              {conflictAlerts.length > 1 ? "s" : ""} Requiring Review
            </span>
          </div>
          <div className="space-y-2">
            {conflictAlerts.map((conflict: any) => (
              <Link
                key={conflict.id}
                href={`/conflicts/${conflict.id}`}
                className="flex items-center justify-between bg-orange-500/5 hover:bg-orange-500/10 rounded-xl px-4 py-2.5 transition-all group"
              >
                <div className="text-sm text-slate-300">
                  <span className="font-medium text-white">
                    {conflict.event.title}
                  </span>
                  <span className="text-slate-500 mx-2">conflicts with</span>
                  <span className="font-medium text-white">
                    {conflict.conflictingEvent.title}
                  </span>
                </div>
                <span className="text-xs text-orange-400 group-hover:underline shrink-0 ml-2">
                  Review →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming Events"
          value={stats.upcomingEventsCount}
          subtitle="Approved & scheduled"
          icon={Calendar}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovalsCount}
          subtitle="Awaiting core review"
          icon={Clock}
          iconColor="text-yellow-400"
          iconBg="bg-yellow-500/10"
        />
        <StatCard
          title="Active Conflicts"
          value={stats.activeConflictsCount}
          subtitle="Need human review"
          icon={AlertTriangle}
          iconColor="text-orange-400"
          iconBg="bg-orange-500/10"
        />
        <StatCard
          title="Total Spent"
          value={formatCurrency(stats.totalSpent)}
          subtitle={
            stats.activeBudgetName
              ? `${budgetPct}% of ${stats.activeBudgetName}`
              : "All time"
          }
          icon={IndianRupee}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
      </div>

      {/* ── Budget Progress ── */}
      {stats.activeBudgetAmount > 0 && (
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white">
                {stats.activeBudgetName ?? "Current Budget"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatCurrency(stats.totalSpent)} spent of{" "}
                {formatCurrency(stats.activeBudgetAmount)} budget
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-400">
                {formatCurrency(stats.remainingBudget)} remaining
              </p>
              <p className="text-xs text-slate-500">{budgetPct}% used</p>
            </div>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetPct > 90
                  ? "bg-red-500"
                  : budgetPct > 70
                  ? "bg-yellow-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Bottom Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Upcoming Events</h3>
            <Link
              href="/events"
              className="text-xs text-blue-400 hover:underline"
            >
              View all →
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              No upcoming events
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((event: any) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-all group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {event.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDateTime(event.startTime)} · {event.venue}
                    </p>
                  </div>
                  <StatusBadge status={event.status} type="event" className="ml-2 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Category Spending */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">
              Spending by Category
            </h3>
            <Link
              href="/expenses"
              className="text-xs text-blue-400 hover:underline"
            >
              View all →
            </Link>
          </div>
          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              No expenses recorded yet
            </p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.slice(0, 5).map((cat: any) => {
                const pct =
                  stats.totalSpent > 0
                    ? Math.round((cat.total / stats.totalSpent) * 100)
                    : 0;
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-300 capitalize">
                        {cat.category.charAt(0) + cat.category.slice(1).toLowerCase()}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatCurrency(cat.total)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Expenses */}
      {recentExpenses.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Expenses</h3>
            <Link
              href="/expenses"
              className="text-xs text-blue-400 hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-700/50">
                  <th className="text-left pb-2 font-medium">Description</th>
                  <th className="text-left pb-2 font-medium">Category</th>
                  <th className="text-left pb-2 font-medium">Event</th>
                  <th className="text-right pb-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {recentExpenses.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 pr-4">
                      <span className="text-slate-300 truncate block max-w-[160px]">
                        {exp.description ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded-full">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-400 text-xs">
                      {exp.event?.title ?? "General"}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-emerald-400">
                      {formatCurrency(exp.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
