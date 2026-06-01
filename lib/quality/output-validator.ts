/**
 * Unified output quality gate — merges input-understanding validation with
 * creator-facing quality checks (leakage, generic openings, duplicate hooks).
 */
import {
  containsBannedPhrases,
  containsInstructionLeak,
  hookPassesValidation,
  lacksCuriosity,
  repeatsSessionTitle,
  titlePassesValidation,
} from '@/lib/input-understanding/output-validation'
import { isBannedHookOpening, isBannedTitle } from '@/lib/cinematic/content-angle-engine'

/** Single pass — server returns best candidate; client no longer re-fetches on validation miss. */
export const MAX_OUTPUT_VALIDATION_RETRIES = 0

export type OutputValidationIssue =
  | 'instruction_leak'
  | 'banned_phrase'
  | 'duplicate_hook'
  | 'generic_opening'
  | 'banned_pattern'
  | 'too_short'

export type OutputValidationResult = {
  ok: boolean
  issues: OutputValidationIssue[]
}

function collectTitleIssues(
  title: string,
  rawInput: string,
  recentTitles: readonly string[]
): OutputValidationIssue[] {
  const issues: OutputValidationIssue[] = []
  const t = title.trim()
  if (!t || t.length < 4) issues.push('too_short')
  if (containsInstructionLeak(t, rawInput)) issues.push('instruction_leak')
  if (containsBannedPhrases(t)) issues.push('banned_phrase')
  if (repeatsSessionTitle(t, recentTitles)) issues.push('duplicate_hook')
  if (lacksCuriosity(t, 'title') && t.length < 12) issues.push('generic_opening')
  if (isBannedTitle(t)) issues.push('banned_pattern')
  return issues
}

function collectHookIssues(
  hook: string,
  rawInput: string,
  recentTitles: readonly string[]
): OutputValidationIssue[] {
  const issues: OutputValidationIssue[] = []
  const h = hook.trim()
  if (!h || h.length < 10) issues.push('too_short')
  if (containsInstructionLeak(h, rawInput)) issues.push('instruction_leak')
  if (containsBannedPhrases(h)) issues.push('banned_phrase')
  if (repeatsSessionTitle(h, recentTitles)) issues.push('duplicate_hook')
  if (lacksCuriosity(h, 'hook')) issues.push('generic_opening')
  if (isBannedHookOpening(h)) issues.push('banned_pattern')
  return issues
}

export function validateTitleOutput(
  title: string,
  rawInput: string,
  recentTitles: readonly string[] = []
): OutputValidationResult {
  const issues = collectTitleIssues(title, rawInput, recentTitles)
  return { ok: titlePassesValidation(title, rawInput, recentTitles) && issues.length === 0, issues }
}

export function validateHookOutput(
  hook: string,
  rawInput: string,
  recentTitles: readonly string[] = []
): OutputValidationResult {
  const issues = collectHookIssues(hook, rawInput, recentTitles)
  return { ok: hookPassesValidation(hook, rawInput, recentTitles) && issues.length === 0, issues }
}

export function validateTitleHookBundle(
  title: string,
  hook: string,
  rawInput: string,
  recentTitles: readonly string[] = []
): OutputValidationResult {
  const titleResult = validateTitleOutput(title, rawInput, recentTitles)
  const hookResult = validateHookOutput(hook, rawInput, recentTitles)
  const issues = [...new Set([...titleResult.issues, ...hookResult.issues])]
  return { ok: titleResult.ok && hookResult.ok, issues }
}

export function shouldRegenerateOutput(result: OutputValidationResult): boolean {
  return !result.ok
}

export { titlePassesValidation, hookPassesValidation, containsInstructionLeak }
