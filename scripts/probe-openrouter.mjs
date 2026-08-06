import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const key = process.env.OPENROUTER_API_KEY?.trim()
if (!key) {
  console.error('No OPENROUTER_API_KEY')
  process.exit(1)
}

const models = ['qwen/qwen3-235b-a22b', 'deepseek/deepseek-chat-v3-0324', 'meta-llama/llama-3.3-70b-instruct']

async function main() {
  const modelsRes = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  })
  console.log('GET /models', modelsRes.status, modelsRes.statusText)
  if (!modelsRes.ok) {
    console.log(await modelsRes.text())
    return
  }

  for (const model of models) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Mugtee AI Studio',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Return JSON: {"ok":true}' },
          { role: 'user', content: 'ping' },
        ],
        max_tokens: 32,
      }),
    })
    const body = await res.text()
    console.log('\n---', model, '---')
    console.log('Status:', res.status)
    console.log('Body:', body.slice(0, 500))
  }
}

main().catch(console.error)
