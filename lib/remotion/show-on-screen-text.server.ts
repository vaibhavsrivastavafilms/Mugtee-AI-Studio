import 'server-only'

/** When false, Remotion omits caption/subtitle overlay layers (audio unchanged). */
export function showOnScreenText(): boolean {
  const raw = process.env.SHOW_ON_SCREEN_TEXT?.trim().toLowerCase()
  if (raw === 'false' || raw === '0' || raw === 'off' || raw === 'no') return false
  return true
}
