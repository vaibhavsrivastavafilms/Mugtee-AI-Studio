import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getBaseUrl } from '@/lib/url'

async function handle(request: NextRequest) {
  const base = getBaseUrl(request)
  const response = NextResponse.redirect(`${base}/login`)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: any) => response.cookies.set({ name, value, ...options }),
        remove: (name: string, options: any) => response.cookies.set({ name, value: '', ...options, maxAge: 0 }),
      },
    }
  )
  await supabase.auth.signOut()
  return response
}

export async function POST(request: NextRequest) { return handle(request) }
export async function GET(request: NextRequest) { return handle(request) }
