const PLACEHOLDER_KEY_PATTERNS = [
  /^your_key/i,
  /^sk_your/i,
  /^pk_your/i,
  /pollinations\.ai$/i,
  /^replace/i,
  /^changeme/i,
]

export const GEN_POLLINATIONS_BASE = 'https://gen.pollinations.ai'

export type PollinationsKeyDiagnostic = {
  present: boolean
  validFormat: boolean
  length: number
  prefix: 'sk_' | 'pk_' | 'other' | 'none'
  rejectedAsPlaceholder: boolean
  source: 'process.env.POLLINATIONS_API_KEY'
}

export function normalizePollinationsEnvKey(raw: string | undefined): string {
  let value = raw?.trim() ?? ''
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim()
  }
  return value.replace(/^\uFEFF/, '')
}

export function inspectPollinationsKeyConfig(
  rawEnv: string | undefined = process.env.POLLINATIONS_API_KEY
): PollinationsKeyDiagnostic {
  const normalized = normalizePollinationsEnvKey(rawEnv)
  const present = Boolean(normalized)
  const rejectedAsPlaceholder =
    Boolean(normalized) && PLACEHOLDER_KEY_PATTERNS.some((pattern) => pattern.test(normalized))
  const validFormat = present && !rejectedAsPlaceholder && /^sk_|^pk_/.test(normalized)
  const prefix: PollinationsKeyDiagnostic['prefix'] = normalized.startsWith('sk_')
    ? 'sk_'
    : normalized.startsWith('pk_')
      ? 'pk_'
      : present
        ? 'other'
        : 'none'

  return {
    present,
    validFormat,
    length: normalized.length,
    prefix,
    rejectedAsPlaceholder,
    source: 'process.env.POLLINATIONS_API_KEY',
  }
}

function acceptPollinationsApiKey(raw: string | undefined): string | undefined {
  const normalized = normalizePollinationsEnvKey(raw)
  if (!normalized) return undefined
  if (PLACEHOLDER_KEY_PATTERNS.some((pattern) => pattern.test(normalized))) return undefined
  if (!/^sk_|^pk_/.test(normalized)) return undefined
  return normalized
}

export function readPollinationsApiKeyFromEnv(
  rawEnv: string | undefined = process.env.POLLINATIONS_API_KEY
): string | undefined {
  return (
    acceptPollinationsApiKey(rawEnv) ??
    acceptPollinationsApiKey(process.env.POLLINATIONS_APP_KEY)
  )
}
