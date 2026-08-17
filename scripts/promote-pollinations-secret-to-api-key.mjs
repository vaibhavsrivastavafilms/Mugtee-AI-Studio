/**
 * Promote POLLINATIONS_SECRET_KEY (sk_) into POLLINATIONS_API_KEY in .env.local.
 * Never logs key values. Use after account capability update.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from 'dotenv'

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

const sk = acceptKey(process.env.POLLINATIONS_SECRET_KEY)
if (!sk?.startsWith('sk_')) {
  console.log('POLLINATIONS_SECRET_KEY: missing valid sk_ key — no change')
  process.exit(1)
}

const envPath = resolve(process.cwd(), '.env.local')
let contents = readFileSync(envPath, 'utf8')
const line = `POLLINATIONS_API_KEY=${sk}`

if (/^POLLINATIONS_API_KEY=/m.test(contents)) {
  contents = contents.replace(/^POLLINATIONS_API_KEY=.*$/m, line)
} else {
  contents = `${contents.trimEnd()}\n${line}\n`
}

writeFileSync(envPath, contents, 'utf8')
console.log('POLLINATIONS_API_KEY: updated from POLLINATIONS_SECRET_KEY (sk_ promoted, value not logged)')
