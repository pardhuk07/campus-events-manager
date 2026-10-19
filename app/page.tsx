import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-3xl space-y-6">
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
          ACM NIT Surat Hackathon
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Conflict-Aware Events & Expenses Manager
        </h1>
        <p className="text-lg text-slate-600">
          Centralized management for campus events, conflict resolution, club expenses, and budget tracking.
        </p>

        <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-4">
          <Link
            href="/events"
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-500 hover:shadow"
          >
            <span className="font-semibold text-slate-900">Events</span>
            <span className="text-xs text-slate-500">Person 1 Module</span>
          </Link>
          <Link
            href="/conflicts"
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-amber-500 hover:shadow"
          >
            <span className="font-semibold text-slate-900">Conflicts</span>
            <span className="text-xs text-slate-500">Person 2 Module</span>
          </Link>
          <Link
            href="/expenses"
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-500 hover:shadow"
          >
            <span className="font-semibold text-slate-900">Expenses</span>
            <span className="text-xs text-slate-500">Person 3 Module</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-purple-500 hover:shadow"
          >
            <span className="font-semibold text-slate-900">Dashboard</span>
            <span className="text-xs text-slate-500">Person 4 Module</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
