import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getBaseUrl, safeRelative } from '@/lib/url'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = safeRelative(url.searchParams.get('next'), '/dashboard')
  const base = getBaseUrl(request)

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=missing_code`)
  }

  // Build the response FIRST so we can attach Supabase session cookies to it.
  const response = NextResponse.redirect(`${base}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchange error:', error.message)
    return NextResponse.redirect(`${base}/login?error=oauth_failed&msg=${encodeURIComponent(error.message)}`)
  }

  return response
}
