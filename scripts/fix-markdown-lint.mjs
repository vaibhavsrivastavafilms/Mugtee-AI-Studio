#!/usr/bin/env node
/**
 * Fix common markdownlint issues: MD060 tables, MD040 fences, MD013 line length.
 * Usage: node scripts/fix-markdown-lint.mjs path/to/file.md [...]
 */
import fs from 'node:fs'
import path from 'node:path'

const MAX_LEN = 80

function fixTableLine(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return line
  const cells = trimmed.slice(1, -1).split('|').map((c) => c.trim())
  return `| ${cells.join(' | ')} |`
}

function wrapProseLine(line) {
  if (line.length <= MAX_LEN) return [line]
  if (/^\s*[#>|*-]/.test(line)) return [line]
  if (/^\s*\d+\.\s/.test(line)) return [line]
  if (line.trim().startsWith('`') && line.trim().endsWith('`')) return [line]

  const indent = line.match(/^(\s*)/)?.[1] ?? ''
  const words = line.trim().split(/\s+/)
  const lines = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= MAX_LEN - indent.length) {
      current = next
    } else {
      if (current) lines.push(`${indent}${current}`)
      current = word
    }
  }
  if (current) lines.push(`${indent}${current}`)
  return lines.length ? lines : [line]
}

function fixMarkdown(content) {
  const lines = content.split('\n')
  const out = []
  let inCode = false
  let codeLangSet = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    if (/^```/.test(line.trim())) {
      const trimmed = line.trim()
      if (!inCode) {
        inCode = true
        codeLangSet = trimmed.length > 3
        if (!codeLangSet) {
          line = '```text'
        }
      } else {
        inCode = false
        codeLangSet = false
      }
      out.push(line)
      continue
    }

    if (inCode) {
      out.push(line)
      continue
    }

    if (/^\|/.test(line.trim()) && line.includes('|')) {
      out.push(fixTableLine(line))
      continue
    }

    if (line.length > MAX_LEN) {
      out.push(...wrapProseLine(line))
      continue
    }

    out.push(line)
  }

  return out.join('\n')
}

const files = process.argv.slice(2)
if (!files.length) {
  console.error('Usage: node scripts/fix-markdown-lint.mjs <file.md> [...]')
  process.exit(1)
}

for (const file of files) {
  const abs = path.resolve(file)
  const before = fs.readFileSync(abs, 'utf8')
  const after = fixMarkdown(before)
  if (before !== after) {
    fs.writeFileSync(abs, after, 'utf8')
    console.log(`fixed: ${file}`)
  } else {
    console.log(`unchanged: ${file}`)
  }
}
