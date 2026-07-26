/** Shared tokens for the premium Mugtee landing experience. */
export const CINEMATIC_HOME_BG = '#050505'
export const CINEMATIC_GOLD = '#D4AF37'

export const glassPanel =
  'mugtee-world-card rounded-[2rem] border border-[rgba(212,175,55,0.18)] bg-[#191919]/90 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.55)]'

export const goldButton =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E6C252] via-[#D4AF37] to-[#B8962E] text-[#050505] text-[11px] tracking-[0.12em] uppercase font-semibold shadow-[0_0_28px_rgba(212,175,55,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(212,175,55,0.32)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/30'

export const outlineGoldButton =
  'inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(212,175,55,0.45)] bg-transparent text-[#D4AF37] text-[10px] tracking-[0.16em] uppercase font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D4AF37]/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/25'

export const ghostButton =
  'inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(212,175,55,0.18)] bg-[#141414]/80 text-[#B8B8B8] text-[11px] tracking-[0.12em] uppercase font-medium transition duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/40 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/25'

export const HOME_NAV = [
  { label: 'Watch', href: '#watch' },
  { label: 'Quick Cut', href: '#quick-cut' },
  { label: 'Director', href: '#director' },
  { label: 'Examples', href: '#examples' },
  { label: 'Pricing', href: '#pricing' },
] as const

export const STUDIO_ENTRY = '/studio'
export const STUDIO_QUICK = '/studio/quick'
export const STUDIO_DIRECTOR = '/studio/director'
export const WATCH_DEMO_HREF = '#watch'
