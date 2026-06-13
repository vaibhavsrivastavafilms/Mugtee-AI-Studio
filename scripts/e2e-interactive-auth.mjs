/**
 * Opens a headed browser for Google sign-in, then saves Playwright storage state.
 * Usage: npm run test:e2e:auth-interactive
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

function loadEnvLocal() {
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

async function main() {
  loadEnvLocal()
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
  const outPath = path.join(process.cwd(), 'e2e/.auth/user.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  console.log('[AUTH_VERIFY] Opening browser — sign in with Google, then wait…')
  try {
    await page.goto(
      `${baseURL}/auth/login?next=${encodeURIComponent('/studio/quick')}`,
      { waitUntil: 'commit', timeout: 60_000 }
    )
  } catch {
    // OAuth redirect to Google aborts the initial navigation — expected.
  }

  const deadline = Date.now() + 5 * 60_000
  while (Date.now() < deadline) {
    let signedIn = false
    try {
      signedIn = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/profile', { credentials: 'include' })
          if (!res.ok) return false
          const data = await res.json()
          return data?.signed_in === true
        } catch {
          return false
        }
      })
    } catch {
      signedIn = false
    }

    if (signedIn) {
      try {
        await page.goto(`${baseURL}/studio/quick`, {
          waitUntil: 'networkidle',
          timeout: 120_000,
        })
      } catch {
        // Session cookies are enough even if studio page is slow.
      }
      await context.storageState({ path: outPath })
      console.log('[AUTH_VERIFY] PASS — saved', outPath)
      await browser.close()
      process.exit(0)
    }

    await page.waitForTimeout(2000)
  }

  console.error('[AUTH_VERIFY] FAIL — timed out after 5 minutes waiting for sign-in')
  await browser.close()
  process.exit(1)
}

main().catch((err) => {
  console.error('[AUTH_VERIFY] FAIL —', err?.message || err)
  process.exit(1)
})
