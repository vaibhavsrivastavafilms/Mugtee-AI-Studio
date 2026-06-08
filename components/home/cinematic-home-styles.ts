/** Shared tokens for the 100vh cinematic marketing homepage. */
export const CINEMATIC_HOME_BG = '#050505'
export const CINEMATIC_GOLD = '#D4AF37'

export const glassPanel =
  'rounded-2xl border border-[#D4AF37]/18 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_48px_rgba(212,175,55,0.07)]'

export const goldButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E8C547] via-[#D4AF37] to-[#B8962E] text-black text-[11px] tracking-[0.14em] uppercase font-semibold shadow-[0_0_24px_rgba(212,175,55,0.35)] hover:opacity-95 transition-opacity'

export const outlineGoldButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/55 bg-transparent text-white text-[10px] tracking-[0.18em] uppercase font-medium hover:bg-[#D4AF37]/10 transition-colors'

export const ghostButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/[0.04] text-white/90 text-[11px] tracking-[0.14em] uppercase hover:border-[#D4AF37]/40 hover:bg-white/[0.06] transition-colors'

export const HOME_NAV = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
] as const

export const STUDIO_ENTRY = '/studio'
export const STUDIO_QUICK = '/studio/quick'
export const STUDIO_DIRECTOR = '/studio/director'
export const WATCH_DEMO_HREF = '#how-it-works'
