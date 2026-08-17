/**
 * Sync Pollinations credentials from .env.local to Vercel production (never logs values).
 * Uses POLLINATIONS_API_KEY when valid (sk_/pk_), else POLLINATIONS_APP_KEY.
 */
import { config } from 'dotenv'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

config({ path: resolve(process.cwd(), '.env.local') })

function normalize(raw) {
  let value = raw?.trim() ?? ''
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim()
  }
  return value.replace(/^\uFEFF/, '')
}

function acceptKey(raw) {
  const normalized = normalize(raw)
  if (!normalized) return null
  if (/^your_key|^sk_your|^pk_your|pollinations\.ai$|^replace|^changeme/i.test(normalized)) return null
  if (!/^sk_|^pk_/.test(normalized)) return null
  return normalized
}

const effectiveKey =
  acceptKey(process.env.POLLINATIONS_API_KEY) ?? acceptKey(process.env.POLLINATIONS_APP_KEY)

if (!effectiveKey) {
  console.log('POLLINATIONS_API_KEY: SKIP (no valid sk_/pk_ key in local env)')
  process.exit(1)
}

spawnSync('npx', ['vercel', 'env', 'rm', 'POLLINATIONS_API_KEY', 'production', '--yes'], {
  stdio: 'ignore',
  shell: true,
})

const add = spawnSync('npx', ['vercel', 'env', 'add', 'POLLINATIONS_API_KEY', 'production'], {
  input: effectiveKey,
  encoding: 'utf8',
  shell: true,
})

if (add.status !== 0) {
  console.error(
    `POLLINATIONS_API_KEY: FAILED to add (${add.stderr?.slice(0, 200) || 'unknown error'})`
  )
  process.exit(1)
}

console.log('POLLINATIONS_API_KEY: ADDED to Vercel production')
