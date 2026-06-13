import fs from 'node:fs'
import path from 'node:path'
import { createServerClient } from '@supabase/ssr'
import { loadEnvLocal } from '../ci/auth-session.mjs'

const AUTH_OUT = path.join(process.cwd(), 'e2e/.auth/user.json')
const E2E_LOCAL = path.join(process.cwd(), '.env.local.e2e')

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]'])

export function loadEnvLocalE2e() {
  if (!fs.existsSync(E2E_LOCAL)) return
  for (const line of fs.readFileSync(E2E_LOCAL, 'utf8').split(/\r?\n/)) {
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

function resolveAuthPath() {
  const envPath = process.env.E2E_STORAGE_STATE?.trim()
  if (envPath && fs.existsSync(envPath)) return path.resolve(envPath)
  return AUTH_OUT
}

function cookieDomainMatchesHost(cookieDomain, host) {
  if (!cookieDomain) return true
  const domain = cookieDomain.replace(/^\./, '')
  if (LOCAL_HOSTS.has(domain) && LOCAL_HOSTS.has(host)) return true
  if (domain === host) return true
  return host.endsWith(domain)
}

function cookiesToHeader(cookies, baseUrl) {
  const host = new URL(baseUrl).hostname
  const authCookies = (cookies ?? []).filter(
    (c) => c?.name && (c.name.includes('auth-token') || cookieDomainMatchesHost(c.domain, host))
  )
  const use = authCookies.length ? authCookies : (cookies ?? [])
  return use.map((c) => `${c.name}=${c.value}`).join('; ')
}

function decodeSupabaseSessionChunk(value) {
  if (!value || typeof value !== 'string') return null
  let raw = value
  if (raw.startsWith('base64-')) raw = raw.slice(7)
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

function userIdFromAuthCookies(cookies) {
  const chunks = (cookies ?? [])
    .filter((c) => c?.name?.includes('auth-token'))
    .sort((a, b) => a.name.localeCompare(b.name))
  for (const c of chunks) {
    const session = decodeSupabaseSessionChunk(c.value)
    if (session?.user?.id) return session.user.id
    if (session?.user_id) return session.user_id
  }
  if (chunks.length >= 2) {
    const joined = chunks.map((c) => c.value).join('')
    const session = decodeSupabaseSessionChunk(joined)
    if (session?.user?.id) return session.user.id
  }
  return null
}

function emailFromAuthCookies(cookies) {
  const chunks = (cookies ?? []).filter((c) => c?.name?.includes('auth-token'))
  for (const c of chunks) {
    const session = decodeSupabaseSessionChunk(c.value)
    if (session?.user?.email) return session.user.email
  }
  return null
}

export async function authFromStorageFile(baseUrl) {
  const file = resolveAuthPath()
  if (!fs.existsSync(file)) return null

  let state
  try {
    state = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }

  const cookieHeader = cookiesToHeader(state.cookies ?? [], baseUrl)
  if (!cookieHeader) return null

  const verify = await fetch(`${baseUrl}/api/profile`, { headers: { Cookie: cookieHeader } })
  const profile = await verify.json().catch(() => ({}))
  if (!verify.ok || profile.signed_in !== true) return null

  const userId =
    profile.user?.id ??
    profile.id ??
    userIdFromAuthCookies(state.cookies) ??
    null
  if (!userId) return null

  return {
    cookieHeader,
    userId,
    email: profile.user?.email ?? profile.email ?? emailFromAuthCookies(state.cookies),
    storageState: file,
  }
}

export async function authFromPassword(baseUrl, email, password) {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !anonKey) throw new Error('Missing Supabase public env')

  const cookieJar = []
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieJar.map(({ name, value, options }) => ({ name, value, ...options }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, ...options }) => {
          cookieJar.push({ name, value, options })
        })
      },
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signInWithPassword: ${error.message}`)
  if (!data.user?.id) throw new Error('signIn returned no user id')

  const cookieHeader = cookieJar.map(({ name, value }) => `${name}=${value}`).join('; ')
  const verify = await fetch(`${baseUrl}/api/profile`, { headers: { Cookie: cookieHeader } })
  const profile = await verify.json().catch(() => ({}))
  if (!verify.ok || profile.signed_in !== true) {
    throw new Error('Session cookies did not authenticate /api/profile')
  }

  const parsed = new URL(baseUrl)
  const cookieDomain = parsed.hostname === '0.0.0.0' ? 'localhost' : parsed.hostname
  fs.mkdirSync(path.dirname(AUTH_OUT), { recursive: true })
  fs.writeFileSync(
    AUTH_OUT,
    JSON.stringify(
      {
        cookies: cookieJar.map(({ name, value, options }) => ({
          name,
          value,
          domain: cookieDomain,
          path: typeof options?.path === 'string' ? options.path : '/',
          httpOnly: options?.httpOnly ?? true,
          secure: parsed.protocol === 'https:',
          sameSite: options?.sameSite ?? 'Lax',
        })),
        origins: [],
      },
      null,
      2
    ),
    'utf8'
  )

  return {
    cookieHeader,
    userId: data.user.id,
    email: data.user.email ?? email,
    storageState: AUTH_OUT,
  }
}

export async function authFromDevBootstrap(baseUrl, body = {}) {
  const res = await fetch(`${baseUrl}/api/dev/bootstrap-e2e-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.authenticated) {
    throw new Error(json.error ?? json.failure?.rootCause ?? 'bootstrap-e2e-session failed')
  }
  if (json.storageStateJson) {
    fs.mkdirSync(path.dirname(AUTH_OUT), { recursive: true })
    fs.writeFileSync(AUTH_OUT, JSON.stringify(json.storageStateJson, null, 2), 'utf8')
  }
  return {
    cookieHeader: json.cookieHeader,
    userId: json.userId,
    email: json.email,
    storageState: AUTH_OUT,
  }
}

export async function bootstrapAuth(baseUrl) {
  loadEnvLocal()
  loadEnvLocalE2e()

  const resolvedAuthPath = resolveAuthPath()
  const authFileExists = fs.existsSync(resolvedAuthPath)
  let authFileReadable = false
  if (authFileExists) {
    try {
      fs.accessSync(resolvedAuthPath, fs.constants.R_OK)
      authFileReadable = true
    } catch {
      authFileReadable = false
    }
  }

  console.log(
    '[AUTH_DEBUG]',
    JSON.stringify({
      cwd: process.cwd(),
      authPath: resolvedAuthPath,
      authFileExpected: AUTH_OUT,
      authFileExists,
      authFileReadable,
      envStorageState: process.env.E2E_STORAGE_STATE ?? null,
      serviceRolePresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      selectedAuthMethod: authFileExists ? 'storage_file_attempt' : 'none_yet',
    })
  )

  // 1–2. E2E_STORAGE_STATE or e2e/.auth/user.json
  const storage = await authFromStorageFile(baseUrl)
  if (storage?.userId && storage?.cookieHeader) {
    console.log(
      '[AUTH_VERIFY]',
      JSON.stringify({
        authenticated: true,
        userId: storage.userId,
        storageState: storage.storageState,
        method: 'storage_file',
      })
    )
    return storage
  }

  if (authFileExists) {
    console.log(
      '[AUTH_DEBUG]',
      JSON.stringify({
        storageLoadFailed: true,
        reason: 'cookies_or_profile_verify_failed',
        cookieHeaderLength: cookiesToHeader(
          JSON.parse(fs.readFileSync(resolvedAuthPath, 'utf8')).cookies ?? [],
          baseUrl
        ).length,
      })
    )
  }

  // 4–5. CI / E2E email+password
  const email =
    process.env.CI_E2E_EMAIL?.trim() ||
    process.env.E2E_EMAIL?.trim() ||
    process.env.EXECUTE_EMAIL?.trim()
  const password =
    process.env.CI_E2E_PASSWORD?.trim() ||
    process.env.E2E_PASSWORD?.trim() ||
    process.env.EXECUTE_PASSWORD?.trim()

  if (email && password) {
    const session = await authFromPassword(baseUrl, email, password)
    console.log(
      '[AUTH_VERIFY]',
      JSON.stringify({
        authenticated: true,
        userId: session.userId,
        storageState: session.storageState,
        method: 'password',
      })
    )
    return session
  }

  // 6. Service role auto-create (last resort)
  if (process.env.NODE_ENV !== 'production' && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    try {
      const session = await authFromDevBootstrap(baseUrl, {})
      console.log(
        '[AUTH_VERIFY]',
        JSON.stringify({
          authenticated: true,
          userId: session.userId,
          storageState: session.storageState,
          method: 'dev_bootstrap',
        })
      )
      return session
    } catch (err) {
      console.warn('[AUTH_VERIFY] dev bootstrap failed:', err?.message ?? err)
    }
  }

  throw new Error(
    `Storage session at ${resolvedAuthPath} exists=${authFileExists} but could not authenticate — re-run /api/dev/capture-session`
  )
}
