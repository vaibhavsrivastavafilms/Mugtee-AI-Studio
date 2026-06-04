export const THUMB_GRADIENT: Record<string, string> = {
  'history-empires': 'from-amber-900/80 via-stone-800/60 to-black',
  'history-dynasty': 'from-red-950/70 via-stone-900/60 to-black',
  'history-stoic': 'from-slate-200/20 via-stone-700/50 to-black',
  'luxury-estate': 'from-amber-100/15 via-stone-800/70 to-black',
  'luxury-craft': 'from-zinc-400/20 via-zinc-900/80 to-black',
  'luxury-old-money': 'from-emerald-950/50 via-slate-900/70 to-black',
  'psychology-shadow': 'from-violet-950/50 via-slate-900/80 to-black',
  'psychology-bias': 'from-sky-950/40 via-slate-900/80 to-black',
  'psychology-bio': 'from-teal-950/40 via-slate-900/80 to-black',
  'finance-calm': 'from-slate-800/80 via-blue-950/50 to-black',
  'finance-myths': 'from-cyan-950/40 via-slate-950/80 to-black',
  'finance-crypto': 'from-indigo-950/50 via-slate-950/80 to-black',
  'motivation-dawn': 'from-amber-500/25 via-stone-950/80 to-black',
  'motivation-comeback': 'from-orange-900/30 via-stone-950/80 to-black',
  'spiritual-still': 'from-sky-900/30 via-slate-950/80 to-black',
  'spiritual-mindful': 'from-amber-200/10 via-stone-900/70 to-black',
  'doc-verite': 'from-stone-600/30 via-stone-950/90 to-black',
  'doc-investigate': 'from-blue-950/50 via-stone-950/80 to-black',
  'faceless-facts': 'from-gold-500/20 via-black to-black',
  'faceless-pov': 'from-amber-900/25 via-stone-950/80 to-black',
}

export function thumbClass(thumbnail: string): string {
  return THUMB_GRADIENT[thumbnail] ?? 'from-gold-500/15 via-stone-900/80 to-black'
}
