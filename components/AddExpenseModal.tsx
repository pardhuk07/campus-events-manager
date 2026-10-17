'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CATEGORY_COLORS } from '@/lib/colors';
import { ExpenseCategory, UserRole } from '@/lib/constants';
import { RupeeIcon, AlertTriangleIcon, ReceiptIcon } from './Icons';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentRole: string;
  currentUser?: any;
  approvedEvents: any[];
  currentTotalSpent: number;
}

export default function AddExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  currentRole,
  currentUser,
  approvedEvents,
  currentTotalSpent,
}: AddExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(ExpenseCategory.FOOD);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventId, setEventId] = useState('');
  const [description, setDescription] = useState('');

  // Receipt state
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptPublicId, setReceiptPublicId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setCategory(ExpenseCategory.FOOD);
      setDate(new Date().toISOString().split('T')[0]);
      setEventId(approvedEvents.length > 0 ? approvedEvents[0].id : '');
      setDescription('');
      setReceiptUrl('');
      setReceiptFileName('');
      setReceiptPublicId('');
      setUploading(false);
      setUploadError(null);
      setErrorMsg(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, approvedEvents]);

  if (!isOpen) return null;

  // Live budget impact calculation
  const numAmount = parseFloat(amount) || 0;
  const isReceiptRequired = numAmount > 500;
  const projectedTotal = currentTotalSpent + numAmount;
  const isOverBudget = numAmount > 0 && projectedTotal > 50000;
  const excessAmount = projectedTotal - 50000;

  // Client-side file validation and upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // 1. Validate file extension and MIME type: PDF, JPG, PNG
    const originalName = file.name || '';
    const lastDotIndex = originalName.lastIndexOf('.');
    const ext = lastDotIndex !== -1 ? originalName.substring(lastDotIndex).toLowerCase() : '';
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];

    const mime = (file.type || '').toLowerCase();
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/pjpeg'];

    const isExtensionValid = allowedExtensions.includes(ext);
    const isMimeValid = !mime || allowedMimes.includes(mime);

    if (!isExtensionValid || !isMimeValid) {
      setUploadError('Invalid file type. Only PDF, JPG, or PNG files are accepted.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Validate file size: Max 5 MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setUploadError(`File size exceeds 5 MB limit (${sizeMb} MB). Please choose a file up to 5 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 3. Upload through server API route
    setUploading(true);
    setReceiptUrl('');
    setReceiptFileName('');
    setReceiptPublicId('');

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
        setReceiptFileName(json.data.fileName || originalName);
        setReceiptPublicId(json.data.publicId || '');
        setUploadError(null);
      } else {
        const errorMsg = json.error?.message || json.error || 'Upload failed.';
        setUploadError(errorMsg);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadError(err.message || 'Network error uploading receipt.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptUrl('');
    setReceiptFileName('');
    setReceiptPublicId('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Client-side validations
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Amount (₹) is required and must be greater than 0.');
      return;
    }

    if (!category) {
      setErrorMsg('Category is required.');
      return;
    }

    if (!eventId) {
      setErrorMsg('An approved event is required.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Description is required.');
      return;
    }

    if (description.trim().length > 200) {
      setErrorMsg('Description cannot exceed 200 characters.');
      return;
    }

    // Receipt conditional requirement & upload error handling:
    // "Make the receipt required for any expense over ₹500 and optional below that.
    //  Show clear error messages if the upload fails, and don’t save the expense if its required upload failed."
    if (uploading) {
      setErrorMsg('Please wait for the receipt to finish uploading before saving.');
      return;
    }

    if (parsedAmount > 500) {
      if (uploadError) {
        setErrorMsg(`Receipt upload failed: ${uploadError}. Please re-upload a valid receipt before saving.`);
        return;
      }
      if (!receiptUrl) {
        setErrorMsg('Receipt upload is strictly required for any expense over ₹500.');
        return;
      }
    } else {
      if (uploadError) {
        setErrorMsg(`Receipt upload failed: ${uploadError}. Please remove the file or re-upload a valid receipt.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const addedByName =
        currentUser?.name ||
        (currentRole === UserRole.CORE_VERIFIER || currentRole === 'ACM_CORE'
          ? 'ACM Core'
          : 'Club Executive');

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentRole,
        },
        body: JSON.stringify({
          amount: parsedAmount,
          category,
          expenseDate: date ? new Date(date) : new Date(),
          eventId,
          description: description.trim(),
          receiptUrl: receiptUrl || null,
          receiptFileName: receiptFileName || null,
          receiptPublicId: receiptPublicId || null,
          addedByName,
          submittedById: currentUser?.id,
          userRole: currentRole,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(json.error?.message || json.error || 'Failed to record expense');
      }
    } catch (err: any) {
      console.error('Error recording expense:', err);
      setErrorMsg(err.message || 'Network error recording expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-slate-900 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600">
                <RupeeIcon className="w-4 h-4" />
              </span>
              Add Club Expense
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Record a verified expense linked to an approved campus event.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-base font-bold p-1 rounded-lg hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Dynamic Red Warning if Expense Pushes Total Spent Above ₹50,000 */}
        {isOverBudget && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
            <span>This exceeds the semester budget by ₹{excessAmount.toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Expense Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Amount (₹, required, > 0) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              {isReceiptRequired && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Receipt Required (&gt; ₹500)
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2500"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold"
              />
            </div>
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category (the existing 8 categories) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                required
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

            {/* Date (defaults to today) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Event (required dropdown of approved events) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Event <span className="text-rose-500">*</span>
            </label>
            {approvedEvents.length === 0 ? (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                No approved events available. Only approved events can have expenses linked.
              </div>
            ) : (
              <select
                required
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="">Select an approved event...</option>
                {approvedEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.club?.name || 'Club'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Receipt Upload using Cloudinary (1 file, PDF/JPG/PNG, Max 5 MB) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Receipt Document{' '}
                {isReceiptRequired ? (
                  <span className="text-rose-600 font-bold">* (Required &gt; ₹500)</span>
                ) : (
                  <span className="text-slate-400 font-normal">(Optional &le; ₹500)</span>
                )}
              </label>
              <span className="text-[10px] text-slate-400">PDF, JPG, PNG (Max 5 MB)</span>
            </div>

            {/* Uploading progress/loading state */}
            {uploading && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center gap-3 text-xs text-indigo-700 animate-pulse">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-semibold">Uploading receipt to Cloudinary...</span>
              </div>
            )}

            {/* Uploaded receipt card */}
            {!uploading && receiptUrl && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <ReceiptIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-semibold text-emerald-900 truncate max-w-[200px]" title={receiptFileName}>
                    {receiptFileName || 'Receipt Attached'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    View
                  </a>
                  <button
                    type="button"
                    onClick={handleRemoveReceipt}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* File input (shown when no receipt uploaded or after remove) */}
            {!uploading && !receiptUrl && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>
            )}

            {/* Upload Error Banner */}
            {uploadError && (
              <div className="mt-1.5 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Description (required, max 200 characters) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Description <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[10px] font-semibold ${description.length > 200 ? 'text-rose-600' : 'text-slate-400'}`}>
                {description.length}/200
              </span>
            </div>
            <textarea
              rows={2}
              required
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Items purchased, invoice number, vendor details (max 200 chars)..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-normal resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || uploading}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploading || approvedEvents.length === 0}
              className="px-5 py-2 text-xs font-bold rounded-xl btn-primary-gradient text-white shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Saving Expense...' : uploading ? 'Uploading Receipt...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
