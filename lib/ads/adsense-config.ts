/** Google AdSense publisher ID — set NEXT_PUBLIC_ADSENSE_CLIENT in Vercel to override. */
export const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || 'ca-pub-5795456698493913'

export const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`

/** Ad unit slot IDs — create in AdSense console, set in Vercel env. */
export const ADSENSE_SLOTS = {
  dashboard: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD?.trim() || '',
  generation: process.env.NEXT_PUBLIC_ADSENSE_SLOT_GENERATION?.trim() || '',
} as const
