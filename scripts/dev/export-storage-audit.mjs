/**
 * Run export storage audit with CI auth cookies.
 * Usage: node scripts/dev/export-storage-audit.mjs
 */
import { createCiAuthCookieHeader, loadEnvLocal } from '../ci/auth-session.mjs'

const BASE_URL = process.env.CI_BASE_URL ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000'

async function main() {
  loadEnvLocal()
  const auth = await createCiAuthCookieHeader(BASE_URL)
  const res = await fetch(`${BASE_URL}/api/dev/export-storage-audit`, {
    headers: { Cookie: auth.cookieHeader },
  })
  const json = await res.json()
  console.log(JSON.stringify(json, null, 2))
  if (json.verdict !== 'PRODUCTION READY') {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[export-storage-audit]', err?.message ?? err)
  process.exit(1)
})
