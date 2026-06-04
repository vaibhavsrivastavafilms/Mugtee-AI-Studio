import { STUDIO_V5 } from '@/lib/studio/studio-design-tokens'

/** Quick Mode — black shell + purple accent only. */
export const QUICK_MODE_V5 = {
  ...STUDIO_V5,
  bg: '#050505',
} as const

export const QUICK_ACCENT = {
  primary: '#8b5cf6',
  primaryHover: '#7c3aed',
  primaryMuted: 'rgba(139, 92, 246, 0.14)',
  primaryRing: 'rgba(139, 92, 246, 0.4)',
  surface: QUICK_MODE_V5.bg,
  surfaceRaised: QUICK_MODE_V5.panel,
  border: 'rgba(255, 255, 255, 0.06)',
} as const

export const quickModePanelClass =
  'rounded-2xl border border-white/[0.08] bg-[#0D0D0D]'

export const quickBtnPrimary =
  'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl text-[10px] font-semibold tracking-[0.12em] uppercase text-white bg-[#8b5cf6] hover:bg-[#7c3aed] shadow-[0_0_20px_-4px_rgba(139,92,246,0.55)] transition disabled:opacity-50'

export const quickBtnOutline =
  'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl text-[10px] font-semibold tracking-[0.12em] uppercase text-luxe/80 border border-white/[0.1] bg-transparent hover:bg-white/[0.04] hover:border-violet-400/30 transition disabled:opacity-50'

export const quickBtnGhost =
  'inline-flex items-center justify-center gap-1.5 h-7 px-2 rounded-lg text-[10px] tracking-[0.1em] uppercase text-luxe/65 hover:text-violet-200 hover:bg-violet-500/[0.06] transition disabled:opacity-40'

export const quickGradientPrimary =
  'bg-gradient-to-r from-[#8b5cf6] via-[#7c3aed] to-[#6366f1] hover:from-[#7c3aed] hover:via-[#6d28d9] hover:to-[#4f46e5]'
