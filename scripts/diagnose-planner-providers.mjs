/**
 * Local planner provider diagnostic — loads .env.local, tests OpenAI + Gemini.
 * Usage: node scripts/diagnose-planner-providers.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env.local')

function loadEnv() {
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv()

const prompt = 'Create a 45 second monsoon restaurant advertisement.'

function maskKey(key) {
  if (!key) return '(missing)'
  if (key.length <= 8) return '(set, short)'
  return `${key.slice(0, 4)}…${key.slice(-4)} (len=${key.length})`
}

console.log('--- Env ---')
console.log('OPENAI_API_KEY:', maskKey(process.env.OPENAI_API_KEY?.trim()))
console.log('GEMINI_API_KEY:', maskKey(process.env.GEMINI_API_KEY?.trim()))
console.log('GEMINI_KEY:', maskKey(process.env.GEMINI_KEY?.trim()))
console.log('PLANNER_PROVIDER:', process.env.PLANNER_PROVIDER ?? '(default auto)')

const { generateProductionPlan } = await import('../agents/planner/providers/registry.server.ts')

try {
  const started = Date.now()
  const plan = await generateProductionPlan({ userPrompt: prompt })
  console.log('--- SUCCESS ---')
  console.log(JSON.stringify(plan, null, 2))
  console.log(`Duration: ${Date.now() - started}ms`)
} catch (err) {
  console.error('--- FAILED ---')
  console.error(err)
  if (err?.failures) console.error('Failures:', err.failures)
  process.exit(1)
}
