'use client';

import React, { useState, useEffect } from 'react';
import BudgetCharts from './BudgetCharts';
import {
  RupeeIcon,
  TrendingUpIcon,
  PlusCircleIcon,
  ReceiptIcon,
  DownloadIcon,
  ShieldCheckIcon,
} from './Icons';
import { CATEGORY_COLORS } from '@/lib/colors';

export default function ExpenseManager({ currentRole }: { currentRole: string }) {
  // Pre-seed with instant baseline data so there is ZERO waiting time or blank screen
  const [data, setData] = useState<any>({
    semester: 'Fall 2026',
    totalBudget: 50000,
    totalSpent: 0,
    remainingBudget: 50000,
    percentSpent: 0,
    categoryBreakdown: {
      REFRESHMENTS: 0,
      PRINTING: 0,
      PRIZES_MEMENTOS: 0,
      LOGISTICS_EQUIPMENT: 0,
      MARKETING_BANNERS: 0,
      MISCELLANEOUS: 0,
    },
    recentExpenses: [],
  });
  const [events, setEvents] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Budget Edit State (STRICTLY for ACM_CORE only)
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState('50000');
  const [savingBudget, setSavingBudget] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('REFRESHMENTS');
  const [eventId, setEventId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [description, setDescription] = useState('');

  const fetchBudget = async () => {
    try {
      const res = await fetch('/api/expenses');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setNewBudgetAmount(String(json.data.totalBudget || 50000));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const json = await res.json();
      if (json.success && json.data) {
        setEvents(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBudget();
    fetchEvents();
  }, []);

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudgetAmount || currentRole !== 'ACM_CORE') return;

    setSavingBudget(true);
    try {
      const res = await fetch('/api/budget', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester: data?.semester || 'Fall 2026',
          totalAllocated: parseFloat(newBudgetAmount),
          userRole: currentRole,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setIsEditingBudget(false);
        fetchBudget();
      } else {
        alert(result.error);
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
      if (json.success) {
        setReceiptUrl(json.url);
      } else {
        alert('Upload failed: ' + json.error);
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
    if (!title || !amount || currentRole === 'MEMBER') return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
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
        setTitle('');
        setAmount('');
        setReceiptUrl('');
        setDescription('');
        setEventId('');
        fetchBudget();
      } else {
        alert(result.error);
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

  const budget = data?.totalBudget || 50000;
  const spent = data?.totalSpent || 0;
  const remaining = data?.remainingBudget || 50000;
  const percent = Math.min(100, Math.round((spent / budget) * 100));

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Budget Card */}
        <div className="bg-[#0b1328] border border-[var(--border-navy)] p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Total Semester Budget</span>
            <div className="flex items-center gap-2">
              <RupeeIcon className="w-4 h-4 text-cyan-400" />
              {currentRole === 'ACM_CORE' && (
                <button
                  type="button"
                  onClick={() => setIsEditingBudget(!isEditingBudget)}
                  className="text-[11px] bg-violet-600/20 hover:bg-violet-600 text-cyan-300 hover:text-white px-2 py-0.5 rounded-lg border border-violet-500/30 transition font-bold"
                >
                  {isEditingBudget ? 'Cancel' : 'Edit Budget'}
                </button>
              )}
            </div>
          </div>

          {isEditingBudget && currentRole === 'ACM_CORE' ? (
            <form onSubmit={handleUpdateBudget} className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="100"
                  required
                  value={newBudgetAmount}
                  onChange={(e) => setNewBudgetAmount(e.target.value)}
                  className="w-full bg-[#060b18] border border-[var(--border-navy)] rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-bold"
                />
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="btn-primary-gradient text-white text-xs px-3 py-2 rounded-xl font-bold transition shadow"
                >
                  {savingBudget ? '...' : 'Save'}
                </button>
              </div>
              <p className="text-[10px] text-amber-400">Authorized: ACM Core Verifier override privilege</p>
            </form>
          ) : (
            <>
              <div className="text-3xl font-black mt-2 text-white">₹{budget.toLocaleString()}</div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Allocated for {data?.semester || 'Semester'}</p>
            </>
          )}
        </div>

        {/* Total Spent Card */}
        <div className="bg-[#0b1328] border border-[var(--border-navy)] p-6 rounded-2xl shadow-xl text-white">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Total Spent</span>
            <TrendingUpIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black mt-2 text-cyan-300">₹{spent.toLocaleString()}</div>
          <div className="w-full bg-[#060b18] rounded-full h-2 mt-3 overflow-hidden border border-[var(--border-navy)]">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${percent > 85 ? 'bg-red-500' : 'btn-primary-gradient'}`}
              style={{ width: `${percent}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">{percent}% of budget utilized</p>
        </div>

        {/* Remaining Funds Card */}
        <div className="bg-[#0b1328] border border-[var(--border-navy)] p-6 rounded-2xl shadow-xl text-white">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Remaining Balance</span>
            <RupeeIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-3xl font-black mt-2 ${remaining < 5000 ? 'text-red-400' : 'text-emerald-400'}`}>
            ₹{remaining.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">Available for upcoming activities</p>
        </div>
      </div>

      {/* 2. Visual Charts Row with Distinct Category Colors */}
      <BudgetCharts
        totalBudget={budget}
        totalSpent={spent}
        remainingBudget={remaining}
        percentSpent={percent}
        categoryBreakdown={data?.categoryBreakdown || {}}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. Expense Submission or Member Read-Only Notice */}
        <div className="bg-[#0b1328] border border-[var(--border-navy)] p-6 rounded-2xl shadow-xl text-white">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-xl bg-[#101b37] border border-[var(--border-navy-light)] text-cyan-400">
              <PlusCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Record Transaction</h2>
              <p className="text-xs text-slate-400">Add voucher with digital receipt proof</p>
            </div>
          </div>

          {currentRole === 'MEMBER' ? (
            <div className="bg-[#060b18] border border-[var(--border-navy)] p-6 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-[#101b37] rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <ShieldCheckIcon className="w-6 h-6 text-slate-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">Read-Only Financial View</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                As a Regular Member, you can transparently view all budgets and transaction histories. 
                Only Club Executives and ACM Core members have permission to record new expenses and bills.
              </p>
            </div>
          ) : (
            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Title / Item</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Refreshments for Tech Workshop"
                  className="w-full bg-[#060b18] border border-[var(--border-navy)] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1500"
                    className="w-full bg-[#060b18] border border-[var(--border-navy)] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#060b18] border border-[var(--border-navy)] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="REFRESHMENTS">Refreshments</option>
                    <option value="PRINTING">Printing</option>
                    <option value="PRIZES_MEMENTOS">Prizes & Mementos</option>
                    <option value="LOGISTICS_EQUIPMENT">Logistics & Equip</option>
                    <option value="MARKETING_BANNERS">Marketing Banners</option>
                    <option value="MISCELLANEOUS">Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Linked Event (Institutional Memory)
                </label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full bg-[#060b18] border border-[var(--border-navy)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">General Club Expense (Unlinked)</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({new Date(ev.startTime).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Upload Bill / Receipt
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:btn-primary-gradient file:text-white cursor-pointer bg-[#060b18] rounded-xl border border-[var(--border-navy)]"
                />
                {uploading && <p className="text-xs text-amber-400 mt-1 font-medium">Uploading receipt...</p>}
                {receiptUrl && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400 bg-[var(--status-approved-bg)] border border-[var(--status-approved-border)] p-2.5 rounded-xl">
                    <ReceiptIcon className="w-4 h-4 text-emerald-400" />
                    <span className="truncate flex-1 font-medium">Receipt Attached</span>
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-bold hover:text-emerald-300"
                    >
                      Preview
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Vendor details, voucher number, invoice notes..."
                  className="w-full bg-[#060b18] border border-[var(--border-navy)] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary-gradient disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-lg mt-2"
              >
                {submitting ? 'Recording...' : 'Add Expense Record'}
              </button>
            </form>
          )}
        </div>

        {/* 4. Transactions Ledger */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0b1328] border border-[var(--border-navy)] p-6 rounded-2xl shadow-xl text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span>Transactions Ledger</span>
                <ReceiptIcon className="w-4 h-4 text-slate-400" />
              </h3>

              <button
                type="button"
                onClick={handleDownloadReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#101b37] hover:bg-[#172447] text-cyan-300 hover:text-white border border-[var(--border-navy)] rounded-xl text-xs font-semibold transition shadow-sm"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                Export Institutional Memory (CSV)
              </button>
            </div>

            {data?.recentExpenses?.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-6 text-center">No transactions recorded yet this semester.</p>
            ) : (
              <div className="divide-y border-t border-[var(--border-navy)] border-slate-800/80">
                {data?.recentExpenses?.map((item: any) => {
                  const catInfo = CATEGORY_COLORS[item.category] || { hex: '#818cf8', label: item.category };

                  return (
                    <div key={item.id} className="py-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{item.title}</span>
                          {item.event && (
                            <span className="text-[10px] bg-[#101b37] text-cyan-300 border border-[var(--border-navy)] px-1.5 py-0.5 rounded-md font-semibold">
                              {item.event.title}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2.5 mt-1">
                          <span
                            className="px-2 py-0.5 rounded text-white font-medium text-[10px]"
                            style={{ backgroundColor: `${catInfo.hex}25`, border: `1px solid ${catInfo.hex}50`, color: catInfo.hex }}
                          >
                            {catInfo.label}
                          </span>
                          <span>{new Date(item.date).toLocaleDateString()}</span>
                          {item.receiptUrl && (
                            <a
                              href={item.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 font-semibold hover:underline"
                            >
                              View Receipt
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="font-black text-sm text-cyan-300">₹{item.amount.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
