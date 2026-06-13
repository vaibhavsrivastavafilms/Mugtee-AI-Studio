import fs from 'node:fs'
import path from 'node:path'
import { chromium, type FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

function loadEnvLocal(): void {
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

async function ensureTestUser(email: string, password: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceKey) return

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: list, error: listError } = await admin.auth.admin.listUsers()
  if (listError) {
    console.warn('[AUTH_VERIFY] listUsers failed:', listError.message)
    return
  }

  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!existing) {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) {
      throw new Error(`E2E createUser failed: ${error.message}`)
    }
    console.log('[AUTH_VERIFY] Created E2E user')
    return
  }

  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  })
  if (error) {
    throw new Error(`E2E updateUser failed: ${error.message}`)
  }
}

async function createStorageStateFromPassword(
  baseURL: string,
  outPath: string,
  email: string,
  password: string
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or anon key')
  }

  await ensureTestUser(email, password)

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const cookieJar: { name: string; value: string; options: CookieOptions }[] = []

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
          cookieJar.push({ name, value, options: options as CookieOptions })
        })
      },
    },
  })

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    await browser.close()
    throw new Error(`E2E signInWithPassword failed: ${error.message}`)
  }

  const parsed = new URL(baseURL)
  await context.addCookies(
    cookieJar.map(({ name, value, options }) => ({
      name,
      value,
      domain: parsed.hostname,
      path: typeof options?.path === 'string' ? options.path : '/',
      httpOnly: options?.httpOnly ?? true,
      secure: parsed.protocol === 'https:',
      sameSite:
        (options?.sameSite as 'Lax' | 'Strict' | 'None' | undefined) ?? 'Lax',
      expires:
        typeof options?.maxAge === 'number'
          ? Math.floor(Date.now() / 1000) + options.maxAge
          : undefined,
    }))
  )

  const page = await context.newPage()
  await page.goto(`${baseURL}/api/profile`)
  const body = await page.textContent('body')
  if (!body?.includes('"signed_in":true')) {
    await browser.close()
    throw new Error('E2E session cookies did not authenticate /api/profile')
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  await context.storageState({ path: outPath })
  await browser.close()
}

async function globalSetup(config: FullConfig): Promise<void> {
  loadEnvLocal()

  const outPath = path.join(process.cwd(), 'e2e/.auth/user.json')
  if (fs.existsSync(outPath)) {
    console.log('[AUTH_VERIFY] PASS — existing e2e/.auth/user.json')
    return
  }

  const storageOverride = process.env.E2E_STORAGE_STATE?.trim()
  if (storageOverride && fs.existsSync(storageOverride)) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.copyFileSync(storageOverride, outPath)
    console.log('[AUTH_VERIFY] PASS — copied E2E_STORAGE_STATE to e2e/.auth/user.json')
    return
  }

  const email = process.env.E2E_EMAIL?.trim()
  const password = process.env.E2E_PASSWORD?.trim()
  if (!email || !password) {
    console.warn(
      '[AUTH_VERIFY] SKIP — no e2e/.auth/user.json and no E2E_EMAIL/E2E_PASSWORD. Run: npm run test:e2e:auth-interactive'
    )
    return
  }

  const baseURL =
    (config.projects[0]?.use?.baseURL as string | undefined) ??
    process.env.E2E_BASE_URL ??
    'http://localhost:3000'

  await createStorageStateFromPassword(baseURL, outPath, email, password)
  console.log('[AUTH_VERIFY] PASS — saved e2e/.auth/user.json via E2E_EMAIL/E2E_PASSWORD')
}

export default globalSetup
