/** Quick Cut V2 — black + gold design tokens. */

export const QC_V2 = {
  bg: '#050505',
  surface: '#111111',
  gold: '#D4AF37',
  goldAccent: '#E6C76A',
  goldHighlight: '#F4D58D',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  border: 'rgba(212,175,55,0.15)',
} as const

export const qcV2Panel =
  'rounded-2xl border bg-[#111111] border-[rgba(212,175,55,0.15)] shadow-[0_8px_40px_rgba(0,0,0,0.45)]'

export const qcV2GoldButton =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-xl font-semibold text-[#050505] bg-[linear-gradient(135deg,#F4D58D_0%,#D4AF37_50%,#B8962E_100%)] hover:opacity-95 active:scale-[0.98] transition touch-manipulation disabled:opacity-45'

export const qcV2GhostButton =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl font-medium text-white/85 border border-[rgba(212,175,55,0.25)] bg-[#111111] hover:border-[rgba(212,175,55,0.45)] hover:bg-[#161616] transition touch-manipulation disabled:opacity-45'
