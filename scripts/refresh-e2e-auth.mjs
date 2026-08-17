/**
 * Refresh e2e/.auth/user.json using E2E_EMAIL / E2E_PASSWORD from .env.local.
 * Usage: E2E_BASE_URL=https://mugtee.in node scripts/refresh-e2e-auth.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { config } from 'dotenv'
import setup from '../e2e/global-setup.ts'

config({ path: path.join(process.cwd(), '.env.local') })

const outPath = path.join(process.cwd(), 'e2e/.auth/user.json')
if (fs.existsSync(outPath)) {
  fs.unlinkSync(outPath)
}

const baseURL = process.env.E2E_BASE_URL?.trim() || 'https://mugtee.in'
await setup({ projects: [{ use: { baseURL } }] })
console.log('[refresh-e2e-auth] done', outPath)
