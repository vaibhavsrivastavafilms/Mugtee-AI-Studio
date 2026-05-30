import { languageDirective } from '@/lib/cinematic/language-prompt'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'

export const DEEP_RESEARCH_SECTION_HEADINGS = [
  'Core explanation',
  'Rare facts',
  'Extreme/viral hooks',
  'Historical and cultural context',
  'Comparisons and metaphors',
  'Controversies, myths, debates',
  'Future predictions',
] as const

/** Faceless YouTube deep-research prompt — structured headings + bullets for script writing. */
export function buildDeepResearchPrompt(topic: string, language?: ProjectLanguage): string {
  const trimmed = topic.trim()
  const langLock = language ? `\n${languageDirective(language)}\n` : ''

  return `You are a viral faceless YouTube research analyst. Produce surprising, retention-ready research — NOT generic encyclopedia summaries.

Topic: ${trimmed || '<YOUR TOPIC OR TITLE>'}
${langLock}
Research this topic deeply for a faceless YouTube documentary script. Use your training knowledge only — no live web browsing.

Output format (mandatory):
- Use markdown headings exactly matching the section titles below
- Under each heading, use bullet points (- ...)
- Keep bullets specific, surprising, and script-ready (facts, angles, hooks a narrator can speak)
- Style: surprising, viral-ready, NOT generic knowledge

Required sections:

## Core explanation
- What the topic really is — the non-obvious angle most creators miss

## Rare facts
- Specific, little-known facts that would make a viewer say "wait, really?"

## Extreme/viral hooks
- Opening lines and curiosity gaps that could stop the scroll (3–6 bullets)

## Historical and cultural context
- Timeline beats, cultural weight, and "why this matters now"

## Comparisons and metaphors
- Analogies that make complex ideas stick for a general audience

Optional sections (include when relevant — omit empty ones):

## Controversies, myths, debates
- Myths to bust, debates to frame, stakes that create tension

## Future predictions
- Plausible near-future angles that tease a payoff without sci-fi fluff

Return ONLY the structured research document — no preamble, no JSON wrapper.`
}

/** Inject deep-research context into cinematic script generation prompts. */
export function buildDeepResearchScriptContextSection(researchDocument: string): string {
  const doc = researchDocument.trim()
  if (!doc) return ''

  return [
    '═══ DEEP RESEARCH CONTEXT (pre-script pass) ═══',
    'Use this research as factual and creative fuel for the script.',
    'Prefer rare facts, viral hooks, and metaphors from below — weave naturally into narration.',
    'Do NOT copy bullets verbatim; transform into spoken documentary voice.',
    'Training-knowledge research only — verify nothing requires live web sources.',
    '---',
    doc.slice(0, 12_000),
    '---',
  ].join('\n')
}
