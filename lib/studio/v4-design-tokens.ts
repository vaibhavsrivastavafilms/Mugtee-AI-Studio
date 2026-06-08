/** Mugtee V4 — Cinematic Creator Operating System design tokens. */

export const V4 = {
  bg: '#050505',
  card: '#0B0B0B',
  border: 'rgba(255,255,255,0.08)',
  gold: '#D4AF37',
  goldGlow: 'rgba(212,175,55,0.25)',
  purple: '#7C4DFF',
  success: '#22C55E',
  danger: '#EF4444',
} as const

export const v4PanelClass =
  'rounded-2xl border border-white/[0.08] bg-[#0B0B0B]'

export const v4GoldButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E8C547] via-[#D4AF37] to-[#B8962E] text-black text-[11px] tracking-[0.12em] uppercase font-semibold shadow-[0_0_24px_rgba(212,175,55,0.35)] hover:opacity-95 transition-opacity disabled:opacity-45'

export const v4GoldOutline =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D4AF37]/45 bg-transparent text-[10px] tracking-[0.12em] uppercase text-gold-200/85 hover:bg-[#D4AF37]/10 transition-colors'

export const v4DangerOutline =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/45 bg-red-500/[0.06] text-[10px] tracking-[0.12em] uppercase text-red-200/90 hover:bg-red-500/[0.12] transition-colors'
