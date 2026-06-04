import { STUDIO_V5 } from '@/lib/studio/studio-design-tokens'

/** Director Mode — black shell + gold accent only. */
export const DIRECTOR_MODE_V5 = {
  ...STUDIO_V5,
  bg: '#060606',
} as const

export const DIRECTOR_ACCENT = {
  primary: '#E7C56A',
  primaryHover: '#D4AF37',
  primaryMuted: 'rgba(231, 197, 106, 0.14)',
  primaryRing: 'rgba(231, 197, 106, 0.4)',
  surface: DIRECTOR_MODE_V5.bg,
  surfaceRaised: DIRECTOR_MODE_V5.panel,
  border: 'rgba(255, 255, 255, 0.06)',
} as const

export const directorModePanelClass =
  'rounded-2xl border border-white/[0.08] bg-[#0D0D0D]'

export const directorGlassPanel =
  'rounded-2xl border border-gold-500/20 bg-white/[0.03] backdrop-blur-xl'

export const directorBtnPrimary =
  'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl text-[10px] font-semibold tracking-[0.12em] uppercase text-black bg-gold-gradient hover:opacity-90 shadow-gold-glow transition disabled:opacity-50'

export const directorBtnOutline =
  'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl text-[10px] font-semibold tracking-[0.12em] uppercase text-gold-200/90 border border-gold-500/30 bg-gold-500/[0.06] hover:bg-gold-500/10 hover:border-gold-500/40 transition disabled:opacity-50'

export const directorBtnGhost =
  'inline-flex items-center justify-center gap-1.5 h-7 px-2 rounded-lg text-[10px] tracking-[0.1em] uppercase text-luxe/65 hover:text-gold-200 hover:bg-gold-500/[0.08] transition disabled:opacity-40'

export const directorGradientPrimary =
  'bg-gold-gradient hover:opacity-90 shadow-gold-glow'
