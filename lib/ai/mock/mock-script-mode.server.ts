/** True when env value is explicitly enabled. */
function envTruthy(key: string): boolean {
  const raw = process.env[key]?.trim().toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'yes'
}

/**
 * Mock script generation for local development when providers fail or are unavailable.
 * Enabled when any of these are set:
 * - SCRIPT_GENERATION_MOCK
 * - AI_MOCK_MODE
 * - MOCK_AI
 * - AI_SCRIPT_MOCK_FALLBACK (legacy)
 */
export function isScriptGenerationMockEnabled(): boolean {
  return (
    envTruthy('SCRIPT_GENERATION_MOCK') ||
    envTruthy('AI_MOCK_MODE') ||
    envTruthy('MOCK_AI') ||
    envTruthy('AI_SCRIPT_MOCK_FALLBACK')
  )
}

/** @deprecated Use isScriptGenerationMockEnabled */
export function isScriptMockFallbackEnabled(): boolean {
  return isScriptGenerationMockEnabled()
}
