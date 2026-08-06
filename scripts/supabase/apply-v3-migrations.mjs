#!/usr/bin/env node
/**
 * Apply Supabase migrations to the linked remote project via CLI.
 * Requires in .env.local (or environment):
 *   SUPABASE_ACCESS_TOKEN  — from https://supabase.com/dashboard/account/tokens
 *   SUPABASE_DB_PASSWORD   — database password from Project Settings → Database
 * Optional:
 *   SUPABASE_PROJECT_REF   — defaults to ref parsed from NEXT_PUBLIC_SUPABASE_URL
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const envPath = resolve(root, '.env.local')

function loadEnvFile(path) {
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
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile(envPath)

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname
    return host.split('.')[0] || null
  } catch {
    return null
  }
}

const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() ||
  projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim()
const dbPassword = process.env.SUPABASE_DB_PASSWORD?.trim()

if (!projectRef) {
  console.error('Missing project ref. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_PROJECT_REF.')
  process.exit(1)
}

if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens')
  process.exit(1)
}

if (!dbPassword) {
  console.error('Missing SUPABASE_DB_PASSWORD (Project Settings → Database → database password).')
  process.exit(1)
}

function run(cmd, args, extraEnv = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(`Linking project ${projectRef}…`)
run('npx', ['supabase', 'link', '--project-ref', projectRef, '--password', dbPassword, '--yes'], {
  SUPABASE_ACCESS_TOKEN: accessToken,
})

console.log('Pushing migrations…')
run('npx', ['supabase', 'db', 'push', '--linked', '--include-all', '--yes'], {
  SUPABASE_ACCESS_TOKEN: accessToken,
})

console.log('Migration history:')
run('npx', ['supabase', 'migration', 'list', '--linked'], {
  SUPABASE_ACCESS_TOKEN: accessToken,
})

console.log('Done.')
