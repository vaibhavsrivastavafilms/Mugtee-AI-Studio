/** Detect Supabase OAuth PKCE callback params on any route. */
export function hasOAuthCode(
  searchParams: URLSearchParams | { get: (key: string) => string | null }
): boolean {
  const code = searchParams.get('code')
  return Boolean(code && code.trim().length > 0)
}

/** Build /auth/callback URL, preserving code/state and inferring `next` when missing. */
export function buildOAuthCallbackUrl(
  origin: string,
  pathname: string,
  searchParams: URLSearchParams
): string {
  const callback = new URL('/auth/callback', origin)
  searchParams.forEach((value, key) => callback.searchParams.set(key, value))

  if (!callback.searchParams.has('next')) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('code')
    nextParams.delete('state')
    const qs = nextParams.toString()
    const nextPath = qs ? `${pathname}?${qs}` : pathname
    callback.searchParams.set('next', nextPath)
  }

  return callback.toString()
}
