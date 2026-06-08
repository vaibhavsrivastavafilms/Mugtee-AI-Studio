import fs from 'fs'
import path from 'path'

const root = process.cwd()
const exts = ['.ts', '.tsx', '.js', '.jsx']
const importRe =
  /(?:import|export)\s+(?:type\s+)?(?:[^'";]+\s+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g

function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch {
    return null
  }
}

function isClient(content) {
  return /^['"]use client['"]/m.test(content || '')
}

function resolveImport(spec) {
  if (!spec.startsWith('@/')) return null
  const rel = spec.slice(2)
  const base = path.join(root, rel)
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base
  for (const ext of exts) {
    const p = base + ext
    if (fs.existsSync(p)) return p
  }
  for (const ext of exts) {
    const p = path.join(base, 'index' + ext)
    if (fs.existsSync(p)) return p
  }
  return null
}

function getImports(file) {
  const content = readFile(file)
  if (!content) return []
  const out = []
  let m
  importRe.lastIndex = 0
  while ((m = importRe.exec(content))) {
    const spec = m[1] || m[2]
    if (spec) out.push(spec)
  }
  return [...new Set(out)]
}

const serverTarget = path.join(root, 'lib/supabase/server.ts')
const serverSpecs = new Set(['@/lib/supabase/server', '@/lib/supabase/server.ts'])

function rel(p) {
  return path.relative(root, p).split(path.sep).join('/')
}

function leadsToServer(file, visited, stack) {
  if (file === serverTarget) return [...stack, file]
  if (visited.has(file)) return null
  visited.add(file)

  for (const spec of getImports(file)) {
    if (serverSpecs.has(spec) || spec.includes('supabase/server')) {
      return [...stack, file, serverTarget]
    }
  }

  for (const spec of getImports(file)) {
    const resolved = resolveImport(spec)
    if (!resolved) continue
    const hit = leadsToServer(resolved, visited, [...stack, file])
    if (hit) return hit
  }
  return null
}

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.next' || ent.name === '.git') continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, files)
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) files.push(p)
  }
  return files
}

const allFiles = walk(root)
const clientEntries = allFiles.filter((f) => isClient(readFile(f)))

const chains = []
for (const entry of clientEntries) {
  const chain = leadsToServer(entry, new Set(), [])
  if (chain) chains.push(chain)
}

const seen = new Set()
const unique = []
for (const c of chains) {
  const key = c.map(rel).join(' -> ')
  if (!seen.has(key)) {
    seen.add(key)
    unique.push(c)
  }
}

console.log(`CLIENT_ENTRIES: ${clientEntries.length}`)
console.log(`STATIC_CHAINS_TO_SERVER: ${unique.length}`)
for (const c of unique) {
  console.log('---')
  c.forEach((f, i) => console.log(`${'  '.repeat(i)}${i ? '-> ' : ''}${rel(f)}`))
}
