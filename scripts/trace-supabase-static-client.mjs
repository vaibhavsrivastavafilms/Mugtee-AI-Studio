import fs from 'fs'
import path from 'path'

const root = process.cwd()
const exts = ['.ts', '.tsx', '.js', '.jsx']
const staticImportRe =
  /^\s*import\s+(?!type\b)(?:[^'";]+\s+from\s+)?['"]([^'"]+)['"]/gm
const dynamicImportRe = /import\(['"]([^'"]+)['"]\)/g

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

function getStaticImports(file) {
  const content = readFile(file)
  if (!content) return []
  const out = []
  staticImportRe.lastIndex = 0
  let m
  while ((m = staticImportRe.exec(content))) out.push(m[1])
  return [...new Set(out)]
}

function fileReferencesServerModule(file) {
  const content = readFile(file)
  if (!content) return false
  return (
    getStaticImports(file).some(
      (s) => s === '@/lib/supabase/server' || s.includes('supabase/server')
    ) || /import\(['"]@\/lib\/supabase\/server['"]\)/.test(content)
  )
}

const serverTarget = path.join(root, 'lib/supabase/server.ts')

function rel(p) {
  return path.relative(root, p).split(path.sep).join('/')
}

function isExcludedIntermediate(file) {
  const r = rel(file)
  return r.startsWith('app/api/') || r.endsWith('.server.ts') || r.endsWith('.server.tsx')
}

function leadsToServer(file, visited, stack) {
  if (file === serverTarget) return [...stack, file]
  if (visited.has(file)) return null
  visited.add(file)

  if (fileReferencesServerModule(file)) {
    return [...stack, file, serverTarget]
  }

  for (const spec of getStaticImports(file)) {
    const resolved = resolveImport(spec)
    if (!resolved || isExcludedIntermediate(resolved)) continue
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

const clientEntries = walk(root).filter((f) => isClient(readFile(f)))
const chains = []
for (const entry of clientEntries) {
  const chain = leadsToServer(entry, new Set(), [])
  if (chain) chains.push(chain)
}

const byRoot = new Map()
for (const c of chains) {
  const key = rel(c[0])
  const existing = byRoot.get(key)
  const chainRel = c.map(rel)
  if (!existing) byRoot.set(key, chainRel)
  else if (chainRel.length < existing.length) byRoot.set(key, chainRel)
}

console.log(`CLIENT_ENTRIES: ${clientEntries.length}`)
console.log(`STATIC_CLIENT_CHAINS (excl app/api intermediates): ${byRoot.size}`)
for (const [, chain] of [...byRoot.entries()].sort((a, b) => a[1].length - b[1].length)) {
  console.log('---')
  chain.forEach((f, i) => console.log(`${'  '.repeat(i)}${i ? '-> ' : ''}${f}`))
}
