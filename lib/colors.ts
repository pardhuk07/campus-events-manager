// Helper functions mapping dynamic clubs and categories to clean light-theme styles
import { ExpenseCategory } from './constants';

export function getClubTheme(clubName?: string) {
  const name = (clubName || '').toLowerCase();
  if (name.includes('acm')) {
    return {
      text: 'text-sky-700 font-semibold',
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      dot: 'bg-sky-600',
      hex: '#0284c7',
    };
  }
  if (name.includes('ches')) {
    return {
      text: 'text-teal-700 font-semibold',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      dot: 'bg-teal-600',
      hex: '#0d9488',
    };
  }
  if (name.includes('chrd')) {
    return {
      text: 'text-rose-700 font-semibold',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      dot: 'bg-rose-600',
      hex: '#e11d48',
    };
  }
  if (name.includes('ecell') || name.includes('e-cell')) {
    return {
      text: 'text-amber-800 font-semibold',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      dot: 'bg-amber-600',
      hex: '#d97706',
    };
  }
  if (name.includes('phoenix')) {
    return {
      text: 'text-orange-700 font-semibold',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      dot: 'bg-orange-600',
      hex: '#ea580c',
    };
  }
  if (name.includes('drishti')) {
    return {
      text: 'text-purple-700 font-semibold',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      dot: 'bg-purple-600',
      hex: '#9333ea',
    };
  }
  if (name.includes('nexus')) {
    return {
      text: 'text-cyan-800 font-semibold',
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      dot: 'bg-cyan-600',
      hex: '#0891b2',
    };
  }
  if (name.includes('gdgc') || name.includes('gdsc')) {
    return {
      text: 'text-emerald-700 font-semibold',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      dot: 'bg-emerald-600',
      hex: '#059669',
    };
  }
  if (name.includes('cev')) {
    return {
      text: 'text-indigo-700 font-semibold',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      dot: 'bg-indigo-600',
      hex: '#4f46e5',
    };
  }
  if (name.includes('ces')) {
    return {
      text: 'text-slate-700 font-semibold',
      bg: 'bg-slate-100',
      border: 'border-slate-300',
      dot: 'bg-slate-600',
      hex: '#475569',
    };
  }
  if (name.includes('think india') || name.includes('thinkindia')) {
    return {
      text: 'text-amber-700 font-semibold',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      dot: 'bg-amber-600',
      hex: '#d97706',
    };
  }
  return {
    text: 'text-indigo-700 font-semibold',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    dot: 'bg-indigo-600',
    hex: '#4f46e5',
  };
}

// 8 Official Expense Categories from Single Source of Truth:
// FOOD, VENUE, PRIZES, MARKETING, PRINTING, EQUIPMENT, TRAVEL, MISCELLANEOUS
export const CATEGORY_COLORS: Record<string, { hex: string; label: string; bg: string }> = {
  FOOD: { hex: '#0891b2', label: 'Food & Refreshments', bg: 'bg-cyan-50' },
  VENUE: { hex: '#2563eb', label: 'Venue & Facilities', bg: 'bg-blue-50' },
  PRIZES: { hex: '#e11d48', label: 'Prizes & Mementos', bg: 'bg-rose-50' },
  MARKETING: { hex: '#d97706', label: 'Marketing & Banners', bg: 'bg-amber-50' },
  PRINTING: { hex: '#7c3aed', label: 'Printing & Certificates', bg: 'bg-purple-50' },
  EQUIPMENT: { hex: '#4f46e5', label: 'Equipment & AV', bg: 'bg-indigo-50' },
  TRAVEL: { hex: '#059669', label: 'Travel & Honorarium', bg: 'bg-emerald-50' },
  MISCELLANEOUS: { hex: '#475569', label: 'Miscellaneous', bg: 'bg-slate-50' },
};
