import type { CinematicScript, ScriptBeat, ScriptBeatsPayload } from '@/types/cinematic-script'
import {
  parseBeatDurationSec,
  parseScriptBeats,
  scriptTextFromBeats,
  type MugteeScriptBeat,
} from '@/lib/cinematic/script-sop'

export type { ScriptBeat, CinematicScript, ScriptBeatsPayload }

export { scriptTextFromBeats, parseScriptBeats, parseBeatDurationSec }

export function beatsToPayload(
  script: Pick<CinematicScript, 'scriptBeats' | 'payoff' | 'cta'>
): ScriptBeatsPayload {
  return {
    beats: script.scriptBeats,
    payoff: script.payoff || undefined,
    cta: script.cta || undefined,
  }
}

export function payloadToBeats(payload: ScriptBeatsPayload | ScriptBeat[] | null | undefined): {
  beats: ScriptBeat[]
  payoff: string
  cta: string
} {
  if (!payload) return { beats: [], payoff: '', cta: '' }
  if (Array.isArray(payload)) {
    return { beats: parseScriptBeats(payload), payoff: '', cta: '' }
  }
  return {
    beats: parseScriptBeats(payload.beats),
    payoff: typeof payload.payoff === 'string' ? payload.payoff.trim() : '',
    cta: typeof payload.cta === 'string' ? payload.cta.trim() : '',
  }
}

/** Flat narration for voice synthesis — hook + beats + payoff (CTA optional). */
export function narrationFromCinematicScript(script: CinematicScript, includeCta = true): string {
  const parts = [
    script.hook.trim(),
    ...script.scriptBeats.map((b) => b.narration.trim()).filter(Boolean),
    script.payoff.trim(),
  ]
  if (includeCta && script.cta.trim()) parts.push(script.cta.trim())
  return parts.filter(Boolean).join(' ')
}

/** Derive legacy flat script text for export / backward compat. */
export function deriveScriptText(script: CinematicScript): string {
  if (script.scriptBeats.length > 0) {
    return scriptTextFromBeats(
      script.hook,
      script.scriptBeats,
      script.payoff,
      script.cta
    )
  }
  return scriptTextFromBeats(script.hook, [], script.payoff, script.cta)
}

/** One-time migration: flat script string → structured beats. */
export function migrateScriptStringToBeats(
  script: string,
  hook = '',
  payoff = '',
  cta = ''
): CinematicScript {
  const trimmed = script.trim()
  if (!trimmed) {
    return { hook: hook.trim(), scriptBeats: [], payoff: payoff.trim(), cta: cta.trim() }
  }

  const beats: ScriptBeat[] = []
  let resolvedHook = hook.trim()
  let resolvedPayoff = payoff.trim()
  let resolvedCta = cta.trim()

  const sectionPattern =
    /^\[(HOOK|BEAT\s*\d+|PAYOFF|CTA|Hook|Context Setup|Escalation|Insight\/Reveal|Payoff|CTA)\]\s*/i

  const blocks = trimmed.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)

  for (const block of blocks) {
    const match = block.match(sectionPattern)
    if (match) {
      const label = match[1].toUpperCase().replace(/\s+/g, ' ')
      const body = block.slice(match[0].length).trim()
      if (label === 'HOOK') resolvedHook = body || resolvedHook
      else if (label === 'PAYOFF') resolvedPayoff = body || resolvedPayoff
      else if (label === 'CTA') resolvedCta = body || resolvedCta
      else if (label.startsWith('BEAT')) {
        beats.push({ narration: body, duration: '4s', emotion: '' })
      } else if (body) {
        beats.push({ narration: body, duration: '4s', emotion: '' })
      }
      continue
    }

    const lines = block.split('\n').filter((l) => l.trim())
    if (lines.length === 1 && lines[0].length >= 8) {
      beats.push({ narration: lines[0].trim(), duration: '4s', emotion: '' })
    }
  }

  if (beats.length === 0) {
    const sentences = trimmed
      .replace(sectionPattern, '')
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 8)
    for (const sentence of sentences.slice(0, 12)) {
      beats.push({ narration: sentence, duration: '4s', emotion: '' })
    }
  }

  return {
    hook: resolvedHook,
    scriptBeats: beats,
    payoff: resolvedPayoff,
    cta: resolvedCta,
  }
}

export function resolveCinematicScript(input: {
  scriptBeats?: ScriptBeat[] | ScriptBeatsPayload | null
  script?: string | null
  hook?: string
  payoff?: string
  cta?: string
}): CinematicScript {
  const hook = (input.hook ?? '').trim()
  const payoff = (input.payoff ?? '').trim()
  const cta = (input.cta ?? '').trim()

  let beats: ScriptBeat[] = []
  if (input.scriptBeats) {
    if (Array.isArray(input.scriptBeats)) {
      beats = parseScriptBeats(input.scriptBeats)
    } else {
      beats = payloadToBeats(input.scriptBeats).beats
    }
  }

  if (beats.length > 0) {
    const fromPayload = !Array.isArray(input.scriptBeats)
      ? payloadToBeats(input.scriptBeats as ScriptBeatsPayload)
      : { payoff: '', cta: '' }
    return {
      hook,
      scriptBeats: beats,
      payoff: payoff || fromPayload.payoff,
      cta: cta || fromPayload.cta,
    }
  }

  if (input.script?.trim()) {
    return migrateScriptStringToBeats(input.script, hook, payoff, cta)
  }

  return { hook, scriptBeats: [], payoff, cta }
}

export function cinematicScriptFromGenerationOutput(output: {
  hook: string
  scriptBeats?: MugteeScriptBeat[]
  script?: string
  payoff?: string
  cta?: string
}): CinematicScript {
  const beats = output.scriptBeats?.length
    ? output.scriptBeats
    : output.script?.trim()
      ? migrateScriptStringToBeats(
          output.script,
          output.hook,
          output.payoff ?? '',
          output.cta ?? ''
        ).scriptBeats
      : []

  return {
    hook: output.hook.trim(),
    scriptBeats: beats,
    payoff: (output.payoff ?? '').trim(),
    cta: (output.cta ?? '').trim(),
  }
}

export function totalBeatDurationSec(beats: ScriptBeat[]): number {
  return beats.reduce((sum, beat) => {
    const sec = parseBeatDurationSec(beat.duration)
    return sum + (sec ?? 4)
  }, 0)
}
