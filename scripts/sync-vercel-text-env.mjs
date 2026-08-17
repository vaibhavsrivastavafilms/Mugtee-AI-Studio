/**
 * Sync text provider keys from .env.local to Vercel production (never logs values).
 */
import { config } from 'dotenv'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

config({ path: resolve(process.cwd(), '.env.local') })

const KEYS = ['GEMINI_API_KEY', 'GROQ_API_KEY', 'GEMINI_TEXT_MODEL']

for (const key of KEYS) {
  const value =
    key === 'GEMINI_TEXT_MODEL'
      ? process.env.GEMINI_TEXT_MODEL?.trim() || 'gemini-2.5-flash'
      : process.env[key]?.trim()
  if (!value) {
    console.log(`${key}: SKIP (missing locally)`)
    continue
  }

  spawnSync('npx', ['vercel', 'env', 'rm', key, 'production', '--yes'], {
    stdio: 'ignore',
    shell: true,
  })

  const add = spawnSync('npx', ['vercel', 'env', 'add', key, 'production'], {
    input: value,
    encoding: 'utf8',
    shell: true,
  })

  if (add.status !== 0) {
    console.error(`${key}: FAILED to add (${add.stderr?.slice(0, 200) || 'unknown error'})`)
    process.exitCode = 1
    continue
  }

  console.log(`${key}: ADDED to Vercel production`)
}
