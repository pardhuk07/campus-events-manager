"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";

export default function CreateExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    amount: "",
    category: "FOOD",
    description: "",
    expenseDate: new Date().toISOString().split("T")[0],
    eventId: "",
    receiptUrl: "",
    receiptPublicId: "",
  });

  const categories = [
    "FOOD",
    "VENUE",
    "PRIZES",
    "MARKETING",
    "PRINTING",
    "EQUIPMENT",
    "TRAVEL",
    "MISCELLANEOUS",
  ];

  useEffect(() => {
    // Optionally fetch events for linking
    fetch("/api/events")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setEvents(res.data);
        }
      })
      .catch(() => {});
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingReceipt(true);
      setErrorMessage("");

      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/expenses/upload-receipt", {
        method: "POST",
        body: uploadData,
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to upload receipt");
      }

      setFormData((prev) => ({
        ...prev,
        receiptUrl: result.data.receiptUrl,
        receiptPublicId: result.data.receiptPublicId,
      }));
    } catch (err: any) {
      setErrorMessage(err.message || "Receipt upload failed");
    } finally {
      setUploadingReceipt(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Amount must be a number greater than 0");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        amount: parsedAmount,
        category: formData.category,
        description: formData.description || null,
        expenseDate: new Date(formData.expenseDate).toISOString(),
        eventId: formData.eventId ? formData.eventId : null,
        receiptUrl: formData.receiptUrl || null,
        receiptPublicId: formData.receiptPublicId || null,
        // Default to system ID or demo user id until auth session is connected
        submittedById: "system-seed-user-id",
      };

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to create expense");
      }

      router.push("/expenses");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit expense");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link
        href="/expenses"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Expenses
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Record New Expense</h1>
        <p className="text-sm text-slate-500 mb-6">
          Submit club spending details and attach an official receipt image.
        </p>

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Amount (INR)*
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="500.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Category*
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Expense Date*
              </label>
              <input
                type="date"
                required
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Linked Event (Optional)
              </label>
              <select
                value={formData.eventId}
                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- General / No Event --</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Provide context (e.g., Pizza for 40 participants, banner printings)..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Receipt Upload to Cloudinary */}
          <div className="rounded-lg border-2 border-dashed border-slate-200 p-4 text-center">
            <Upload className="mx-auto h-6 w-6 text-slate-400 mb-2" />
            <span className="block text-sm font-medium text-slate-700">Upload Receipt Bill</span>
            <span className="block text-xs text-slate-400 mb-3">PNG, JPG, or PDF under 5MB</span>
            
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploadingReceipt}
              className="block mx-auto text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />

            {uploadingReceipt && (
              <p className="mt-2 text-xs text-blue-600 flex items-center justify-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Uploading to Cloudinary...
              </p>
            )}

            {formData.receiptUrl && (
              <p className="mt-2 text-xs text-emerald-600 font-semibold">
                ✓ Receipt attached successfully!
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || uploadingReceipt}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Expense
          </button>
        </form>
      </div>
    </div>
  );
}
