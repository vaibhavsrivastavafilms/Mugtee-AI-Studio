import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function ensureTestUser(email: string, password: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY required to auto-create E2E user')
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: list, error: listError } = await admin.auth.admin.listUsers()
  if (listError) throw new Error(`listUsers: ${listError.message}`)

  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  let userId = existing?.id

  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw new Error(`createUser: ${error.message}`)
    userId = data.user?.id
  } else {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })
    if (error) throw new Error(`updateUser: ${error.message}`)
  }

  if (!userId) throw new Error('Could not resolve user id')

  const trialEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await admin.from('profiles').upsert(
    {
      id: userId,
      plan_type: 'PRO_TRIAL',
      trial_claimed: true,
      trial_started_at: new Date().toISOString(),
      trial_ends_at: trialEnds,
    },
    { onConflict: 'id' }
  )

  return userId
}

/** Dev-only — mint E2E session cookies for execute scripts. */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available outside development' }, { status: 404 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const email =
    (typeof body.email === 'string' ? body.email.trim() : '') ||
    process.env.CI_E2E_EMAIL?.trim() ||
    process.env.E2E_EMAIL?.trim() ||
    process.env.EXECUTE_EMAIL?.trim() ||
    'mugtee.execute@mugtee.dev'
  const password =
    (typeof body.password === 'string' ? body.password.trim() : '') ||
    process.env.CI_E2E_PASSWORD?.trim() ||
    process.env.E2E_PASSWORD?.trim() ||
    process.env.EXECUTE_PASSWORD?.trim() ||
    'MugteeExecute!2026'

  try {
    const userId = await ensureTestUser(email, password)

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    if (!url || !anonKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or anon key')
    }

    const cookieJar: { name: string; value: string; options: CookieOptions }[] = []
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieJar.map(({ name, value, options }) => ({ name, value, ...options }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, ...options }) => {
            cookieJar.push({ name, value, options: options as CookieOptions })
          })
        },
      },
    })

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) throw new Error(`signInWithPassword: ${signInErr.message}`)

    const cookieHeader = cookieJar.map(({ name, value }) => `${name}=${value}`).join('; ')
    const baseUrl = req.nextUrl.origin
    const verify = await fetch(`${baseUrl}/api/profile`, { headers: { Cookie: cookieHeader } })
    const profile = await verify.json().catch(() => ({}))
    if (!verify.ok || profile.signed_in !== true) {
      throw new Error('Minted session did not authenticate /api/profile')
    }

    const parsed = new URL(baseUrl)
    const storageStateJson = {
      cookies: cookieJar.map(({ name, value, options }) => ({
        name,
        value,
        domain: parsed.hostname,
        path: typeof options?.path === 'string' ? options.path : '/',
        httpOnly: options?.httpOnly ?? true,
        secure: parsed.protocol === 'https:',
        sameSite: (options?.sameSite as string | undefined) ?? 'Lax',
      })),
      origins: [],
    }

    console.info(
      '[AUTH_VERIFY]',
      JSON.stringify({ authenticated: true, userId, email, storageState: 'e2e/.auth/user.json' })
    )

    return NextResponse.json({
      authenticated: true,
      userId,
      email,
      cookieHeader,
      storageStateJson,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        authenticated: false,
        error: message,
        failure: {
          rootCause: message,
          file: 'app/api/dev/bootstrap-e2e-session/route.ts',
          function: 'POST',
          line: 59,
          fix: 'Add SUPABASE_SERVICE_ROLE_KEY to .env.local from Supabase Dashboard → Settings → API, then retry.',
          confidence: 'High',
        },
      },
      { status: 503 }
    )
  }
}
