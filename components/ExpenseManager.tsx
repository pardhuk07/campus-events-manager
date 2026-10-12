'use client';

import React, { useState, useEffect } from 'react';
import BudgetCharts from './BudgetCharts';
import {
  RupeeIcon,
  TrendingUpIcon,
  PlusCircleIcon,
  ReceiptIcon,
  DownloadIcon,
} from './Icons';
import { CATEGORY_COLORS } from '@/lib/colors';
import { UserRole, ExpenseCategory } from '@/lib/constants';

export default function ExpenseManager({ currentRole }: { currentRole: string }) {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Budget Edit State (STRICTLY for CORE_VERIFIER)
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState('50000');
  const [savingBudget, setSavingBudget] = useState(false);

  // Form State
  const [category, setCategory] = useState<string>(ExpenseCategory.FOOD);
  const [amount, setAmount] = useState('');
  const [eventId, setEventId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [description, setDescription] = useState('');

  const isCoreVerifier = currentRole === UserRole.CORE_VERIFIER || currentRole === 'ACM_CORE';
  const isMember = currentRole === UserRole.MEMBER;

  const fetchBudgetData = async () => {
    try {
      const [budgetsRes, expensesRes, eventsRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/expenses'),
        fetch('/api/events'),
      ]);

      const budgetsJson = await budgetsRes.json();
      const expensesJson = await expensesRes.json();
      const eventsJson = await eventsRes.json();

      if (budgetsJson.success && budgetsJson.data) {
        setBudgets(budgetsJson.data);
        if (budgetsJson.data.length > 0) {
          setNewBudgetAmount(String(budgetsJson.data[0].amount));
        }
      }
      if (expensesJson.success && expensesJson.data) {
        setExpenses(expensesJson.data);
      }
      if (eventsJson.success && eventsJson.data) {
        setEvents(eventsJson.data);
      }
    } catch (err) {
      console.error('Failed to load expenses/budget data:', err);
    }
  };

  useEffect(() => {
    fetchBudgetData();
  }, []);

  const activeBudget = budgets[0] || {
    id: 'budget-fall-2026',
    name: 'Fall 2026 Semester Budget',
    amount: 50000,
    totalSpent: 0,
    remainingBudget: 50000,
    percentSpent: 0,
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudgetAmount || !isCoreVerifier) return;

    setSavingBudget(true);
    try {
      const res = await fetch(`/api/budgets/${activeBudget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(newBudgetAmount),
          userRole: UserRole.CORE_VERIFIER,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setIsEditingBudget(false);
        fetchBudgetData();
      } else {
        alert(result.error?.message || result.error || 'Failed to update budget');
      }
    } catch (err) {
      console.error('Error updating budget:', err);
    } finally {
      setSavingBudget(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.data?.url) {
        setReceiptUrl(json.data.url);
      } else {
        alert('Upload failed: ' + (json.error?.message || 'Error'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload error');
    } finally {
      setUploading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isMember) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          category,
          eventId: eventId || null,
          receiptUrl,
          description,
          userRole: currentRole,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setAmount('');
        setReceiptUrl('');
        setDescription('');
        setEventId('');
        fetchBudgetData();
      } else {
        alert(result.error?.message || result.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReport = () => {
    window.open('/api/reports/handover?format=csv', '_blank');
  };

  // Compute category breakdown from expenses array
  const categoryBreakdown: Record<string, number> = {};
  for (const cat of Object.values(ExpenseCategory)) {
    categoryBreakdown[cat] = 0;
  }
  for (const ex of expenses) {
    if (categoryBreakdown[ex.category] !== undefined) {
      categoryBreakdown[ex.category] += parseFloat(ex.amount);
    }
  }

  const budget = parseFloat(activeBudget.amount) || 50000;
  const spent = parseFloat(activeBudget.totalSpent) || expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const remaining = budget - spent;
  const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Budget Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-900 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Total Semester Budget</span>
            <div className="flex items-center gap-2">
              <RupeeIcon className="w-4 h-4 text-indigo-600" />
              {isCoreVerifier && (
                <button
                  type="button"
                  onClick={() => setIsEditingBudget(!isEditingBudget)}
                  className="text-[11px] bg-violet-50 hover:bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-lg border border-violet-200 transition font-bold"
                >
                  {isEditingBudget ? 'Cancel' : 'Edit Budget'}
                </button>
              )}
            </div>
          </div>

          {isEditingBudget && isCoreVerifier ? (
            <form onSubmit={handleUpdateBudget} className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="100"
                  required
                  value={newBudgetAmount}
                  onChange={(e) => setNewBudgetAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 font-bold"
                />
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="btn-primary-gradient text-white text-xs px-3 py-2 rounded-xl font-bold transition shadow-sm"
                >
                  {savingBudget ? '...' : 'Save'}
                </button>
              </div>
              <p className="text-[10px] text-amber-700 font-medium">Authorized: CORE_VERIFIER override privilege</p>
            </form>
          ) : (
            <>
              <div className="text-3xl font-black mt-2 text-slate-900">₹{budget.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1 font-medium">{activeBudget.name || 'Semester Budget'}</p>
            </>
          )}
        </div>

        {/* Total Spent Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-900">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Total Spent</span>
            <TrendingUpIcon className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-3xl font-black mt-2 text-cyan-700">₹{spent.toLocaleString()}</div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden border border-slate-200">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${percent > 85 ? 'bg-rose-500' : 'btn-primary-gradient'}`}
              style={{ width: `${percent}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">{percent}% of budget utilized</p>
        </div>

        {/* Remaining Budget Card (Calculated Rule 4) */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-900">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Remaining Balance</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-3xl font-black mt-2 text-emerald-600">₹{remaining.toLocaleString()}</div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Available for upcoming approved club proposals
          </p>
        </div>
      </div>

      {/* 2. Visual Charts (Donut & Breakdown) */}
      <BudgetCharts
        totalBudget={budget}
        totalSpent={spent}
        remainingBudget={remaining}
        percentSpent={percent}
        categoryBreakdown={categoryBreakdown}
      />

      {/* 3. Action Section: Add Expense & CSV Export */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Record Expense Form (Restricted to Exec & Core) */}
        {!isMember ? (
          <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-900">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <PlusCircleIcon className="w-4 h-4 text-indigo-600" />
              Record Club Expense
            </h3>

            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1500"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    {Object.entries(CATEGORY_COLORS).map(([catKey, info]) => (
                      <option key={catKey} value={catKey}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Linked Event (Optional)</label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="">None / General Club Expense</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Receipt File Upload via Cloudinary */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Receipt Upload (Cloudinary)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {uploading && <span className="text-[10px] text-indigo-600 animate-pulse font-bold">Uploading...</span>}
                </div>
                {receiptUrl && (
                  <p className="text-[10px] text-emerald-700 mt-1 font-semibold">✓ Receipt attached</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Bill Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Items purchased, invoice number, vendor details..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary-gradient disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm"
              >
                {submitting ? 'Recording Expense...' : 'Submit Reimbursement'}
              </button>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-900 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl mb-3 text-slate-500">
              🔒
            </div>
            <h4 className="font-bold text-sm text-slate-900">Member Read-Only Mode</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Public student members can view fund transparency. Club Executives and ACM Core can submit receipts and modify budget allocations.
            </p>
          </div>
        )}

        {/* Recent Ledger / Receipts Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Institutional Ledger</h3>
                <p className="text-xs text-slate-500">Historical reimbursements & digital receipts</p>
              </div>

              <button
                type="button"
                onClick={handleDownloadReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition shadow-xs"
              >
                <DownloadIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Export Handover CSV</span>
              </button>
            </div>

            {expenses.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs italic">
                No expenses logged yet this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                      <th className="pb-2">Description</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Event</th>
                      <th className="pb-2">Receipt</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((item: any) => {
                      const catInfo = CATEGORY_COLORS[item.category] || { label: item.category, hex: '#6366f1' };

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 font-medium text-slate-800">
                            <div>{item.description || item.category}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(item.expenseDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-2.5">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${catInfo.hex}18`, color: catInfo.hex }}
                            >
                              {catInfo.label}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-500 truncate max-w-[140px]">
                            {item.event?.title || 'General'}
                          </td>
                          <td className="py-2.5">
                            {item.receiptUrl ? (
                              <a
                                href={item.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline font-semibold"
                              >
                                <ReceiptIcon className="w-3 h-3" />
                                View
                              </a>
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right font-bold text-slate-900">
                            ₹{parseFloat(item.amount).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Fund Ledger audited under ACM Core Financial Policy</span>
            <span className="font-semibold text-slate-600">Total items: {expenses.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
