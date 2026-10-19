"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Calendar, Tag, FileText, User, ExternalLink, Loader2 } from "lucide-react";

export default function ExpenseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/expenses/${params.id}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setExpense(res.data);
        } else {
          setError(res.error?.message || "Failed to load expense");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this expense record?")) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/expenses/${params.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        router.push("/expenses");
      } else {
        alert(result.error?.message || "Could not delete");
      }
    } catch (err: any) {
      alert(err.message || "Deletion failed");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="text-red-500 mb-4">{error || "Expense not found"}</p>
        <Link href="/expenses" className="text-blue-600 hover:underline">
          Return to list
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/expenses"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Expenses
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete Expense
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 mb-2">
              {expense.category}
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900">
              ₹{Number(expense.amount).toFixed(2)}
            </h1>
          </div>
          <div className="text-right text-xs text-slate-400">
            Recorded {new Date(expense.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <Calendar className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Expense Date</p>
              <p className="font-medium">{new Date(expense.expenseDate).toDateString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-700">
            <Tag className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Linked Event</p>
              <p className="font-medium">
                {expense.event ? expense.event.title : "General (Unlinked)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-700">
            <User className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Submitted By</p>
              <p className="font-medium">
                {expense.submittedBy?.name || "Team Member"}
              </p>
            </div>
          </div>
        </div>

        {expense.description && (
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
            <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">
              Description / Notes
            </span>
            <p className="text-sm text-slate-700">{expense.description}</p>
          </div>
        )}

        {/* Receipt display */}
        <div>
          <span className="text-xs font-semibold uppercase text-slate-400 block mb-2">
            Uploaded Receipt
          </span>
          {expense.receiptUrl ? (
            <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-2">
              <img
                src={expense.receiptUrl}
                alt="Receipt Bill"
                className="max-h-96 w-full object-contain rounded"
              />
              <div className="pt-2 text-center">
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open Full Image
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No receipt attached to this record.</p>
          )}
        </div>
      </div>
    </div>
  );
}
