/** Mugtee V6 — premium black & gold design tokens. */

export const V4 = {
  bg: '#050505',
  bgSecondary: '#0D0D0D',
  elevated: '#141414',
  card: '#191919',
  border: 'rgba(212,175,55,0.18)',
  gold: '#D4AF37',
  goldHover: '#E6C252',
  goldGlow: 'rgba(212,175,55,0.22)',
  textPrimary: '#FFFFFF',
  textSecondary: '#B8B8B8',
  textMuted: '#888888',
  success: '#4CAF50',
  danger: '#D9534F',
} as const

export const v4PanelClass =
  'rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#191919]'

export const v4GoldButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E6C252] via-[#D4AF37] to-[#B8962E] text-black text-[11px] tracking-[0.12em] uppercase font-semibold shadow-[0_0_24px_rgba(212,175,55,0.22)] hover:opacity-95 transition-opacity disabled:opacity-45'

export const v4GoldOutline =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D4AF37]/45 bg-transparent text-[10px] tracking-[0.12em] uppercase text-[#D4AF37]/90 hover:bg-[#D4AF37]/10 transition-colors'

export const v4DangerOutline =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D9534F]/45 bg-[#D9534F]/[0.06] text-[10px] tracking-[0.12em] uppercase text-[#D9534F]/90 hover:bg-[#D9534F]/[0.12] transition-colors'
