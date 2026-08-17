import { createHash } from 'node:crypto'

function fp(name) {
  const v = process.env[name]?.trim()
  if (!v) return { present: false }
  let norm = v.replace(/^\uFEFF/, '')
  if (
    (norm.startsWith('"') && norm.endsWith('"')) ||
    (norm.startsWith("'") && norm.endsWith("'"))
  ) {
    norm = norm.slice(1, -1).trim()
  }
  const valid = /^sk_|^pk_/.test(norm)
  return {
    present: true,
    prefix: norm.startsWith('sk_') ? 'sk_' : norm.startsWith('pk_') ? 'pk_' : 'other',
    length: norm.length,
    validFormat: valid,
    fingerprint: createHash('sha256').update(norm).digest('hex').slice(0, 12),
  }
}

console.log(
  JSON.stringify(
    {
      POLLINATIONS_API_KEY: fp('POLLINATIONS_API_KEY'),
      POLLINATIONS_APP_KEY: fp('POLLINATIONS_APP_KEY'),
    },
    null,
    2
  )
)
