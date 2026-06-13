import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

export function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

export async function ensureCiTestUser(email, password) {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: list, error: listError } = await admin.auth.admin.listUsers()
  if (listError) throw new Error(`listUsers failed: ${listError.message}`)

  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  let userId = existing?.id

  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw new Error(`createUser failed: ${error.message}`)
    userId = data.user?.id
  } else {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })
    if (error) throw new Error(`updateUser failed: ${error.message}`)
  }

  if (!userId) throw new Error('Could not resolve CI test user id')

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

/** Returns Cookie header value for authenticated API calls. */
export async function createCiAuthCookieHeader(baseUrl) {
  loadEnvLocal()

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const email =
    process.env.CI_E2E_EMAIL?.trim() ||
    process.env.E2E_EMAIL?.trim() ||
    process.env.CI_SMOKE_EMAIL?.trim()
  const password =
    process.env.CI_E2E_PASSWORD?.trim() ||
    process.env.E2E_PASSWORD?.trim() ||
    process.env.CI_SMOKE_PASSWORD?.trim()

  if (!email || !password) {
    throw new Error(
      'Missing CI_E2E_EMAIL/CI_E2E_PASSWORD (or E2E_EMAIL/E2E_PASSWORD) for smoke auth'
    )
  }

  await ensureCiTestUser(email, password)

  const cookieJar = []
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieJar.map(({ name, value, options }) => ({
          name,
          value,
          ...options,
        }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, ...options }) => {
          cookieJar.push({ name, value, options })
        })
      },
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signInWithPassword failed: ${error.message}`)
  if (!data.user?.id) throw new Error('signInWithPassword returned no user id')

  const cookieHeader = cookieJar.map(({ name, value }) => `${name}=${value}`).join('; ')

  const verify = await fetch(`${baseUrl}/api/profile`, {
    headers: { Cookie: cookieHeader },
  })
  const profile = await verify.json().catch(() => ({}))
  if (!verify.ok || profile.signed_in !== true) {
    throw new Error('CI auth session did not authenticate /api/profile')
  }

  return { cookieHeader, userId: data.user.id, email }
}
