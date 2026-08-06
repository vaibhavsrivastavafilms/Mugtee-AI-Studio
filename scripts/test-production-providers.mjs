/**
 * Test production planner keys without server-only imports.
 * Usage: node scripts/test-production-providers.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile(name) {
  const path = resolve(root, name)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
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
    process.env[key] = value
  }
}

loadEnvFile('.env.production.local')

function mask(v) {
  if (!v) return '(missing)'
  if (v.length <= 8) return `(set len=${v.length})`
  return `${v.slice(0, 4)}…${v.slice(-4)} (len=${v.length})`
}

const keys = [
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'GEMINI_KEY',
  'GOOGLE_API_KEY',
  'PLANNER_PROVIDER',
  'FREE_TIER_ONLY',
]

console.log('=== Production env (masked) ===')
for (const k of keys) {
  console.log(`${k}:`, mask(process.env[k]?.trim()))
}

const geminiKey =
  process.env.GEMINI_API_KEY?.trim() ||
  process.env.GEMINI_KEY?.trim() ||
  process.env.GOOGLE_API_KEY?.trim()

const openaiKey = process.env.OPENAI_API_KEY?.trim()

const SYSTEM = `Return ONLY JSON: {"title":"Test","duration":45,"platform":"YouTube Shorts","language":"English","aspectRatio":"9:16","style":"Cinematic","sceneCount":6,"voice":"Warm","music":"Emotional","characterConsistency":false}`
const USER = 'Create a 45 second monsoon restaurant advertisement.'

async function testOpenAI() {
  if (!openaiKey) return { ok: false, error: 'no key' }
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: USER },
      ],
    }),
  })
  const body = await res.text()
  return { ok: res.ok, status: res.status, body: body.slice(0, 500) }
}

async function testGemini() {
  if (!geminiKey) return { ok: false, error: 'no key' }
  const model = process.env.GEMINI_TEXT_MODEL?.trim() || 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: USER }] }],
      generationConfig: { temperature: 0.35, responseMimeType: 'application/json' },
    }),
  })
  const body = await res.text()
  return { ok: res.ok, status: res.status, body: body.slice(0, 500) }
}

console.log('\n=== OpenAI test ===')
try {
  console.log(await testOpenAI())
} catch (e) {
  console.log('fetch error:', e.message)
}

console.log('\n=== Gemini test ===')
try {
  console.log(await testGemini())
} catch (e) {
  console.log('fetch error:', e.message)
}
