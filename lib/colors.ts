// Helper functions mapping dynamic clubs and categories to clean light-theme styles

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
  if (name.includes('ieee')) {
    return {
      text: 'text-purple-700 font-semibold',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      dot: 'bg-purple-600',
      hex: '#7c3aed',
    };
  }
  if (name.includes('csi')) {
    return {
      text: 'text-rose-700 font-semibold',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      dot: 'bg-rose-600',
      hex: '#e11d48',
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

export const CATEGORY_COLORS: Record<string, { hex: string; label: string; bg: string }> = {
  REFRESHMENTS: { hex: '#0891b2', label: 'Refreshments', bg: 'bg-cyan-50' },
  PRINTING: { hex: '#7c3aed', label: 'Printing', bg: 'bg-purple-50' },
  PRIZES_MEMENTOS: { hex: '#e11d48', label: 'Prizes & Mementos', bg: 'bg-rose-50' },
  LOGISTICS_EQUIPMENT: { hex: '#2563eb', label: 'Logistics', bg: 'bg-blue-50' },
  MARKETING_BANNERS: { hex: '#d97706', label: 'Marketing Banners', bg: 'bg-amber-50' },
  MISCELLANEOUS: { hex: '#475569', label: 'Miscellaneous', bg: 'bg-slate-50' },
};
