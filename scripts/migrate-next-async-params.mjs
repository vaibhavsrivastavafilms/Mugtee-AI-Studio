/**
 * One-time codemod: Next.js 15+ async route params & searchParams.
 * Run: node scripts/migrate-next-async-params.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { globSync } from 'glob'

const root = process.cwd()

function toPromiseParams(typeSrc) {
  if (typeSrc.includes('Promise<')) return typeSrc
  return typeSrc
    .replace(/(\{ params \}: \{ params: )(?!Promise<)/g, '$1Promise<')
    .replace(/(type \w+ = \{ params: )(?!Promise<)/g, '$1Promise<')
    .replace(/(type \w+ = \{\s*params: )(?!Promise<)/gm, '$1Promise<')
    .replace(/(ctx: \{ params: )(?!Promise<)/g, '$1Promise<')
    .replace(/(context: \{ params: )(?!Promise<)/g, '$1Promise<')
    .replace(/(params: )(?!Promise<)(\{[a-zA-Z][^}]*\})/g, (m, p1, p2) => {
      if (m.includes('backfillSuccessBody')) return m
      if (m.includes('Promise<')) return m
      return `${p1}Promise<${p2}>`
    })
}

function closePromiseParams(typeSrc) {
  // `{ params: Promise<{ id: string } }` — add missing `>` before closing `}`
  return typeSrc.replace(
    /params: Promise<(\{[^}]+\})\s*\}/g,
    'params: Promise<$1> }'
  )
}

function migrateSearchParams(typeSrc) {
  return typeSrc.replace(
    /searchParams:\s*(Record<[^>]+>)(?!\s*\|)/g,
    'searchParams: Promise<$1>'
  )
}

function extractParamKeys(paramsType) {
  const match = paramsType.match(/Promise<\{([^}]+)\}>/)
  if (!match) return []
  return match[1]
    .split(',')
    .map((part) => part.trim().split(':')[0]?.trim())
    .filter(Boolean)
}

function injectAwaitParams(content) {
  const handlerRe =
    /export async function \w+\([^)]*\{ params \}[^)]*\)\s*\{/g
  let result = content
  let match

  while ((match = handlerRe.exec(content)) !== null) {
    const start = match.index + match[0].length
    const slice = content.slice(match.index, match.index + 400)
    const typeMatch = slice.match(/params: Promise<(\{[^}]+\})>/)
    if (!typeMatch) continue

    const keys = extractParamKeys(`Promise<${typeMatch[1]}>`)
    if (keys.length === 0) continue

    const afterBrace = content.slice(start, start + 200)
    if (afterBrace.includes('await params')) continue

    const destructure = `const { ${keys.join(', ')} } = await params\n  `
    result =
      result.slice(0, start) + destructure + result.slice(start)

    // Replace params.key with key in this handler only — find handler end roughly
    const handlerStart = start + destructure.length
    let depth = 1
    let i = handlerStart
    while (i < result.length && depth > 0) {
      if (result[i] === '{') depth++
      if (result[i] === '}') depth--
      i++
    }
    const handlerBody = result.slice(handlerStart, i - 1)
    let newBody = handlerBody
    for (const key of keys) {
      newBody = newBody.replace(new RegExp(`params\\.${key}\\b`, 'g'), key)
    }
    result = result.slice(0, handlerStart) + newBody + result.slice(i - 1)
    content = result
    handlerRe.lastIndex = handlerStart + newBody.length
  }

  return result
}

function migratePageComponent(content) {
  const pageFnRe =
    /export default async function \w+\(\{([^}]*)\}\s*:\s*(\w+)\)\s*\{/g
  let result = content
  let match

  while ((match = pageFnRe.exec(content)) !== null) {
    const propsTypeName = match[2]
    const typeDefRe = new RegExp(
      `type ${propsTypeName} = \\{([^}]+)\\}`,
      's'
    )
    const typeMatch = content.match(typeDefRe)
    if (!typeMatch) continue

    let propsBlock = typeMatch[1]
    if (propsBlock.includes('params:') && !propsBlock.includes('Promise<')) {
      propsBlock = propsBlock.replace(
        /params:\s*(\{[^}]+\})/,
        'params: Promise<$1>'
      )
      result = result.replace(typeDefRe, `type ${propsTypeName} = {${propsBlock}}`)
    }
    if (
      propsBlock.includes('searchParams:') &&
      !propsBlock.includes('Promise<')
    ) {
      propsBlock = propsBlock.replace(
        /searchParams:\s*(Record<[^>]+>)/,
        'searchParams: Promise<$1>'
      )
      result = result.replace(typeDefRe, `type ${propsTypeName} = {${propsBlock}}`)
    }

    const fnStart = match.index + match[0].length
    const afterFn = result.slice(fnStart, fnStart + 300)
    if (afterFn.includes('await params') || afterFn.includes('await searchParams'))
      continue

    let prefix = ''
    if (propsBlock.includes('params: Promise<')) {
      const keys = extractParamKeys(
        propsBlock.match(/params: Promise<(\{[^}]+\})>/)?.[0] ?? ''
      )
      if (keys.length) prefix += `const { ${keys.join(', ')} } = await params\n  `
    }
    if (propsBlock.includes('searchParams: Promise<')) {
      prefix += `const searchParams = await searchParamsPromise\n  `.replace(
        'searchParamsPromise',
        'arguments[0]?.searchParams ? arguments[0].searchParams : (await (async () => searchParams)())'
      )
      // simpler: use named destructure in function signature fix below
    }
  }

  return result
}

function migratePagesSimple(content) {
  let result = content

  // Props type with params
  result = result.replace(
    /type Props = \{\s*params: (\{[^}]+\})\s*\}/g,
    'type Props = { params: Promise<$1> }'
  )
  result = result.replace(
    /type Props = \{\s*params: Promise<(\{[^}]+\})\s*\}/g,
    'type Props = { params: Promise<$1> }'
  )

  // Inline page props
  result = result.replace(
    /params: (\{[^}]+\})\s*\n/g,
    (m, inner) => {
      if (m.includes('Promise<')) return m
      if (inner.includes('projectId') || inner.includes('id') || inner.includes('slug'))
        return `params: Promise<${inner}>\n`
      return m
    }
  )

  result = migrateSearchParams(result)

  // Page function: inject await for params
  result = result.replace(
    /(export default async function \w+\([^)]*params[^)]*\)\s*\{)(\s*\n)/,
    (full, head, nl) => {
      if (full.includes('await params')) return full
      return `${head}${nl}  const resolvedParams = await params${nl}  const params = resolvedParams${nl}`
    }
  )

  // searchParams pages
  result = result.replace(
    /(export default async function \w+\(\{\s*searchParams\s*\}[^)]*\)\s*\{)(\s*\n)/,
    (full, head, nl) => {
      if (full.includes('await searchParams')) return full
      return `${head}${nl}  const resolvedSearchParams = await searchParams${nl}  const searchParamsResolved = resolvedSearchParams${nl}`
    }
  )

  return result
}

const patterns = ['app/**/route.ts', 'app/**/route.tsx', 'app/**/page.tsx']

let changed = 0
for (const pattern of patterns) {
  for (const file of globSync(pattern, { cwd: root, absolute: true })) {
    let content = fs.readFileSync(file, 'utf8')
    const original = content

    if (!content.includes('params') && !content.includes('searchParams')) continue

    content = toPromiseParams(content)
    content = closePromiseParams(content)
    content = migrateSearchParams(content)

    if (file.endsWith('route.ts') || file.endsWith('route.tsx')) {
      content = injectAwaitParams(content)
    }

    if (file.endsWith('page.tsx')) {
      content = migratePagesSimple(content)
    }

    if (content !== original) {
      fs.writeFileSync(file, content)
      changed++
      console.log('updated', path.relative(root, file))
    }
  }
}

console.log(`Done. ${changed} files updated.`)
