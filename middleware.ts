import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Pass-through response we can mutate cookies on for session refresh.
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  // Touch the session so cookies get refreshed if needed.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * Skip Next.js internals, static assets, PWA files, and the .well-known folder.
     * Auth-cookie refresh still runs on every real page + API route.
     *
     * Excluded explicitly (otherwise Supabase auth middleware can intercept them
     * and break PWA installability / TWA asset-links verification):
     *   • /manifest.json        — PWA manifest (Bubblewrap fetches this)
     *   • /sw.js                — service worker
     *   • /.well-known/*        — assetlinks.json, security.txt, etc.
     *   • /robots.txt, /sitemap.xml
     *   • any *.{svg,png,jpg,jpeg,gif,webp,ico,json,js,txt,xml,webmanifest,map}
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|\\.well-known|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|txt|xml|webmanifest|map)$).*)',
  ],
}
