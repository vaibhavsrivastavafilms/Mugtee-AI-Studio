/** Shared studio layout — mode palettes live in quick/director token files. */
export const STUDIO_V5 = {
  bg: '#050505',
  panel: '#0D0D0D',
  radius: '16px',
  railWidth: 260,
  contextWidth: 340,
  inspectorWidth: 320,
} as const

export const studioPanelClass =
  'rounded-2xl border border-white/[0.08] bg-[#0D0D0D]'

export const studioGlassPanel =
  'rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl'
