/** Mugtee V5 studio tokens — #050505 shell, #0D0D0D panels, purple + cyan. */
export const STUDIO_V5 = {
  bg: '#050505',
  panel: '#0D0D0D',
  radius: '16px',
  railWidth: 260,
  contextWidth: 340,
  inspectorWidth: 320,
} as const

export const STUDIO_ACCENT = {
  primary: '#8b5cf6',
  primaryHover: '#7c3aed',
  primaryMuted: 'rgba(139, 92, 246, 0.14)',
  primaryRing: 'rgba(139, 92, 246, 0.4)',
  cyan: '#22d3ee',
  cyanMuted: 'rgba(34, 211, 238, 0.12)',
  success: '#34D399',
  successMuted: 'rgba(52, 211, 153, 0.15)',
  surface: STUDIO_V5.bg,
  surfaceRaised: STUDIO_V5.panel,
  glass: 'rgba(255, 255, 255, 0.04)',
  border: 'rgba(255, 255, 255, 0.06)',
} as const

export const studioPanelClass =
  'rounded-2xl border border-white/[0.08] bg-[#0D0D0D]'

export const studioBtnPrimary =
  'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl text-[10px] font-semibold tracking-[0.12em] uppercase text-white bg-[#8b5cf6] hover:bg-[#7c3aed] shadow-[0_0_20px_-4px_rgba(139,92,246,0.55)] transition disabled:opacity-50'

export const studioBtnOutline =
  'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl text-[10px] font-semibold tracking-[0.12em] uppercase text-luxe/80 border border-white/[0.1] bg-transparent hover:bg-white/[0.04] hover:border-white/[0.16] transition disabled:opacity-50'

export const studioBtnGhost =
  'inline-flex items-center justify-center gap-1.5 h-7 px-2 rounded-lg text-[10px] tracking-[0.1em] uppercase text-luxe/65 hover:text-luxe hover:bg-white/[0.04] transition disabled:opacity-40'

export const studioGlassPanel =
  'rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl'

export const studioGradientPrimary =
  'bg-gradient-to-r from-[#8b5cf6] via-[#7c3aed] to-[#6366f1] hover:from-[#7c3aed] hover:via-[#6d28d9] hover:to-[#4f46e5]'

export const quickModePanelClass =
  'rounded-2xl border border-white/[0.08] bg-[#0D0D0D]'
