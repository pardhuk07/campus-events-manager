// Helper functions mapping dynamic clubs and categories to our unified CSS variables

export function getClubTheme(clubName?: string) {
  const name = (clubName || '').toLowerCase();
  if (name.includes('acm')) {
    return {
      text: 'text-sky-300',
      bg: 'bg-[var(--club-acm-bg)]',
      border: 'border-[var(--club-acm-border)]',
      dot: 'bg-[var(--club-acm)]',
      hex: '#38bdf8',
    };
  }
  if (name.includes('ieee')) {
    return {
      text: 'text-purple-300',
      bg: 'bg-[var(--club-ieee-bg)]',
      border: 'border-[var(--club-ieee-border)]',
      dot: 'bg-[var(--club-ieee)]',
      hex: '#a855f7',
    };
  }
  if (name.includes('csi')) {
    return {
      text: 'text-rose-300',
      bg: 'bg-[var(--club-csi-bg)]',
      border: 'border-[var(--club-csi-border)]',
      dot: 'bg-[var(--club-csi)]',
      hex: '#f43f5e',
    };
  }
  return {
    text: 'text-indigo-300',
    bg: 'bg-[var(--club-default-bg)]',
    border: 'border-[var(--club-default-border)]',
    dot: 'bg-[var(--club-default)]',
    hex: '#818cf8',
  };
}

export const CATEGORY_COLORS: Record<string, { hex: string; varName: string; label: string }> = {
  REFRESHMENTS: { hex: '#06b6d4', varName: 'var(--cat-refreshments)', label: 'Refreshments' },
  PRINTING: { hex: '#8b5cf6', varName: 'var(--cat-printing)', label: 'Printing' },
  PRIZES_MEMENTOS: { hex: '#f43f5e', varName: 'var(--cat-prizes)', label: 'Prizes & Mementos' },
  LOGISTICS_EQUIPMENT: { hex: '#3b82f6', varName: 'var(--cat-logistics)', label: 'Logistics' },
  MARKETING_BANNERS: { hex: '#eab308', varName: 'var(--cat-marketing)', label: 'Marketing Banners' },
  MISCELLANEOUS: { hex: '#94a3b8', varName: 'var(--cat-misc)', label: 'Miscellaneous' },
};
