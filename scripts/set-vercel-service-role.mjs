import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env.local')

function readKey(name) {
  if (!existsSync(envPath)) return null
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith(`${name}=`)) continue
    let value = trimmed.slice(name.length + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    return value || null
  }
  return null
}

const key = readKey('SUPABASE_SERVICE_ROLE_KEY')
if (!key) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in .env.local')
  process.exit(1)
}

for (const env of ['production', 'preview']) {
  const result = spawnSync('vercel', ['env', 'add', 'SUPABASE_SERVICE_ROLE_KEY', env, '--force'], {
    cwd: root,
    input: key,
    encoding: 'utf8',
    shell: true,
  })
  if (result.status !== 0) {
    console.error(`Failed to set SUPABASE_SERVICE_ROLE_KEY for ${env}`)
    if (result.stderr) process.stderr.write(result.stderr)
    process.exit(result.status ?? 1)
  }
  console.log(`Set SUPABASE_SERVICE_ROLE_KEY for ${env} (value not printed)`)
}
