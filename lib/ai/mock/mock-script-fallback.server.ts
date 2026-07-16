import type { ProviderFailureSummary } from '@/lib/ai/providers/provider-diagnostics.types'
import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { generateMockScript, type MockScriptInput } from '@/lib/ai/mock/mock-script-generator'
import {
  logMockScript,
  providerIdsFromFailures,
  type MockScriptLogReason,
} from '@/lib/ai/mock/mock-script-log.server'

export type MockScriptFallbackInput = MockScriptInput & {
  reason: MockScriptLogReason
  providerFailures?: ProviderFailureSummary[]
  startedAt?: number
}

export function buildMockScriptWithLog(
  input: MockScriptFallbackInput
): CinematicGenerationOutput {
  const started = input.startedAt ?? Date.now()
  const output = generateMockScript(input)
  logMockScript({
    enabled: true,
    reason: input.reason,
    providerFailures: providerIdsFromFailures(input.providerFailures),
    durationMs: Date.now() - started,
  })
  return output
}
