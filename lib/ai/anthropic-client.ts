import Anthropic from '@anthropic-ai/sdk'
import { isFreeTierOnly } from '@/lib/ai/free-tier'

let cached: Anthropic | null = null

/** Default Claude model for Quick Cut script generation (override via ANTHROPIC_MODEL). Skipped when FREE_TIER_ONLY. */
export const CLAUDE_SCRIPT_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-20250514'

export function anthropicScriptEnabled(): boolean {
  return !isFreeTierOnly() && Boolean(process.env.ANTHROPIC_API_KEY?.trim())
}

/** Creates the Anthropic client on first use (never at module import). */
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Configure it in the environment before calling Anthropic APIs.'
    )
  }
  if (!cached) {
    cached = new Anthropic({ apiKey })
  }
  return cached
}
