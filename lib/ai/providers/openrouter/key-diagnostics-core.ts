const PLACEHOLDER_KEY_PATTERNS = [
  /^your_key/i,
  /^sk_your/i,
  /^replace/i,
  /^changeme/i,
  /^redacted/i,
]

export type OpenRouterKeyDiagnostic = {
  present: boolean
  validFormat: boolean
  length: number
  prefix: 'sk-or-' | 'other' | 'none'
  rejectedAsPlaceholder: boolean
  source: 'process.env.OPENROUTER_API_KEY'
}

export function normalizeOpenRouterEnvKey(raw: string | undefined): string {
  let value = raw?.trim() ?? ''
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim()
  }
  return value.replace(/^\uFEFF/, '')
}

export function inspectOpenRouterKeyConfig(
  rawEnv: string | undefined = process.env.OPENROUTER_API_KEY
): OpenRouterKeyDiagnostic {
  const normalized = normalizeOpenRouterEnvKey(rawEnv)
  const present = Boolean(normalized)
  const rejectedAsPlaceholder =
    Boolean(normalized) && PLACEHOLDER_KEY_PATTERNS.some((pattern) => pattern.test(normalized))
  const validFormat = present && !rejectedAsPlaceholder && normalized.startsWith('sk-or-')
  const prefix: OpenRouterKeyDiagnostic['prefix'] = normalized.startsWith('sk-or-')
    ? 'sk-or-'
    : present
      ? 'other'
      : 'none'

  return {
    present,
    validFormat,
    length: normalized.length,
    prefix,
    rejectedAsPlaceholder,
    source: 'process.env.OPENROUTER_API_KEY',
  }
}

export function readOpenRouterApiKeyFromEnv(
  rawEnv: string | undefined = process.env.OPENROUTER_API_KEY
): string | undefined {
  const normalized = normalizeOpenRouterEnvKey(rawEnv)
  if (!normalized) return undefined
  if (PLACEHOLDER_KEY_PATTERNS.some((pattern) => pattern.test(normalized))) return undefined
  return normalized
}
