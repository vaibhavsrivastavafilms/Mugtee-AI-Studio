import {
  detectInputLanguage,
  languageLabel,
  normalizeProjectLanguage,
  type ProjectLanguage,
} from '@/lib/cinematic/language-detection'

/** Fixed 7-scene creator retention map. */
export const CREATOR_RETENTION_SCENE_COUNT = 7

export type ViralStructureBeatId =
  | 'hook'
  | 'problem'
  | 'empathy'
  | 'solution'
  | 'proof'
  | 'payoff'
  | 'cta'

export type ViralInputMode = 'transcript' | 'voice' | 'topic' | 'story'

/** Extracted skeleton from creator input (Step 1). */
export type ViralStructureAnalysis = {
  hook: string
  pain: string
  emotional_problem: string
  solution: string
  proof: string
  payoff: string
  cta: string
  inputMode: ViralInputMode
  detectedLanguage: ProjectLanguage
}

export type RetentionSceneBeat = {
  sceneIndex: number
  beatId: ViralStructureBeatId
  label: string
  instruction: string
  analysisKey: keyof ViralStructureAnalysis
}

export const RETENTION_SCENE_BEATS: readonly RetentionSceneBeat[] = [
  {
    sceneIndex: 1,
    beatId: 'hook',
    label: 'Hook',
    instruction: 'Pattern interrupt — specific claim, not a quote or philosophy.',
    analysisKey: 'hook',
  },
  {
    sceneIndex: 2,
    beatId: 'problem',
    label: 'Problem',
    instruction: 'Name the concrete pain the viewer recognizes.',
    analysisKey: 'pain',
  },
  {
    sceneIndex: 3,
    beatId: 'empathy',
    label: 'Empathy',
    instruction: 'Validate the struggle — spoken like a creator, not a therapist.',
    analysisKey: 'emotional_problem',
  },
  {
    sceneIndex: 4,
    beatId: 'solution',
    label: 'Solution',
    instruction: 'One clear method or reframe — actionable, not poetic.',
    analysisKey: 'solution',
  },
  {
    sceneIndex: 5,
    beatId: 'proof',
    label: 'Proof',
    instruction: 'Evidence: result, example, before/after, or personal win.',
    analysisKey: 'proof',
  },
  {
    sceneIndex: 6,
    beatId: 'payoff',
    label: 'Payoff',
    instruction: 'Tutorial step or result — show what changes when they apply it.',
    analysisKey: 'payoff',
  },
  {
    sceneIndex: 7,
    beatId: 'cta',
    label: 'CTA',
    instruction: 'Direct creator CTA — save, follow, comment, or try today.',
    analysisKey: 'cta',
  },
] as const

export const RETENTION_STRUCTURE_CHAIN =
  'Hook → Problem → Empathy → Solution → Proof → Payoff → CTA'

const QUOTE_MODE_PATTERNS = [
  /you're not afraid of/i,
  /you are not afraid of/i,
  /you already know the/i,
  /forgetting who you were/i,
  /what if .+ was never about/i,
  /the price of ignoring/i,
  /almost nobody mentions/i,
  /nobody posts about/i,
  /felt harmless/i,
  /uncomfortably familiar/i,
  /the quiet cost of/i,
  /a .+ truth/i,
]

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?।])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8)
}

function topicSubject(raw: string): string {
  const cleaned = raw
    .replace(/^voice presence:\s*/i, '')
    .replace(/^mood keywords:\s*/i, '')
    .replace(/^visual reference:\s*/i, '')
    .trim()
  const firstLine = cleaned.split(/\n/)[0]?.trim() ?? cleaned
  if (firstLine.length <= 72) return firstLine
  return `${firstLine.slice(0, 69)}…`
}

function inferInputMode(text: string): ViralInputMode {
  const trimmed = text.trim()
  if (/voice presence:/i.test(trimmed)) return 'voice'
  const sentences = splitSentences(trimmed)
  if (sentences.length >= 5 || trimmed.length > 280) return 'transcript'
  if (sentences.length >= 3 && trimmed.length > 120) return 'story'
  return 'topic'
}

function pickSentence(sentences: string[], index: number, fallback: string): string {
  return sentences[index]?.trim() || fallback
}

function creatorBeatFallbacks(
  subject: string,
  lang: ProjectLanguage
): Omit<ViralStructureAnalysis, 'inputMode' | 'detectedLanguage'> {
  const topic = subject.replace(/^["']|["']$/g, '').trim()

  if (lang === 'hi') {
    const hinglish = /[\u0900-\u097F]/.test(topic) || /\b(kya|hai|nahi|kaise|kyun)\b/i.test(topic)
    if (hinglish) {
      return {
        hook: `${topic} — yeh galti 90% log karte hain, isliye result nahi milta.`,
        pain: `Problem yeh hai ki log shuru mein basics skip kar dete hain aur phir demotivate ho jaate hain.`,
        emotional_problem: `Agar aap bhi try kar chuke ho aur lagta hai "merse nahi hoga" — yeh normal feel hota hai.`,
        solution: `Pehle ek chhota system banao: roz 20 minute practice, ek clear outcome, aur feedback loop.`,
        proof: `Maine yahi approach use ki — 30 din mein portfolio aur confidence dono improve hue.`,
        payoff: `Step-by-step: pehle reference copy karo, phir apna twist add karo, phir post karo.`,
        cta: `Save karo aur aaj hi step 1 try karo — comment mein batao kya try karoge.`,
      }
    }
    return {
      hook: `${topic} — ज़्यादातर लोग पहला कदम गलत उठाते हैं।`,
      pain: `समस्या यह है कि बिना स्पष्ट योजना के सीखने की कोशिश करते हैं, इसलिए परिणाम नहीं मिलता।`,
      emotional_problem: `अगर आप भी हार मानने वाले थे — यह सामान्य है, आप अकेले नहीं हैं।`,
      solution: `रोज़ 20 मिनट का एक फोकस्ड रूटीन और एक छोटा लक्ष्य रखें।`,
      proof: `इसी तरीके से मैंने 30 दिन में सुधार देखा — यह काम करता है।`,
      payoff: `आज पहला कदम: एक सरल उदाहरण बनाएं और उसे पूरा करें।`,
      cta: `सेव करें और आज ही शुरू करें — कमेंट में बताएं आप क्या करोगे।`,
    }
  }

  return {
    hook: `Stop doing ${topic} the hard way — here's what actually works.`,
    pain: `Most people stuck on ${topic} skip the basics and wonder why nothing clicks.`,
    emotional_problem: `If you've tried before and felt like quitting — that's normal, not a sign you're bad at this.`,
    solution: `Use a simple daily loop: 20 focused minutes, one clear outcome, and quick feedback.`,
    proof: `I used this exact approach — visible progress in 30 days without burning out.`,
    payoff: `Do this today: pick one small task, finish it, post or track the result.`,
    cta: `Save this and try step one today — comment what you're starting with.`,
  }
}

function extractFromLongInput(
  text: string,
  lang: ProjectLanguage
): Omit<ViralStructureAnalysis, 'inputMode' | 'detectedLanguage'> {
  const sentences = splitSentences(text)
  const subject = topicSubject(text.split(/\n\n/)[0] ?? text)
  const fallbacks = creatorBeatFallbacks(subject, lang)

  if (sentences.length < 3) return fallbacks

  const hook = pickSentence(sentences, 0, fallbacks.hook)
  const pain = pickSentence(sentences, 1, fallbacks.pain)
  const emotional = pickSentence(sentences, 2, fallbacks.emotional_problem)
  const solution = pickSentence(sentences, 3, fallbacks.solution)
  const proof = pickSentence(sentences, 4, fallbacks.proof)
  const payoff = pickSentence(sentences, Math.max(5, sentences.length - 2), fallbacks.payoff)
  const cta = pickSentence(sentences, sentences.length - 1, fallbacks.cta)

  return {
    hook,
    pain,
    emotional_problem: emotional,
    solution,
    proof,
    payoff,
    cta,
  }
}

export type AnalyzeViralStructureInput = {
  text: string
  language?: ProjectLanguage | string
  transcript?: string
  voiceNote?: string
}

/** Step 1 — extract creator-native skeleton from transcript, voice, topic, or story. */
export function analyzeViralStructure(input: AnalyzeViralStructureInput): ViralStructureAnalysis {
  const parts = [
    input.transcript?.trim(),
    input.voiceNote?.trim(),
    input.text.trim(),
  ].filter(Boolean) as string[]

  const combined = parts.join('\n\n').trim()
  const detectedLanguage = normalizeProjectLanguage(input.language, combined)
  const inputMode = inferInputMode(combined)

  const beats =
    inputMode === 'topic'
      ? creatorBeatFallbacks(topicSubject(combined), detectedLanguage)
      : extractFromLongInput(combined, detectedLanguage)

  return {
    ...beats,
    inputMode,
    detectedLanguage,
  }
}

export function retentionPatternFromAnalysis(analysis: ViralStructureAnalysis): string {
  return [
    RETENTION_STRUCTURE_CHAIN,
    analysis.hook.slice(0, 80),
    analysis.solution.slice(0, 80),
  ]
    .filter(Boolean)
    .join(' · ')
}

export function buildRetentionNarration(analysis: ViralStructureAnalysis): string {
  return RETENTION_SCENE_BEATS.map((beat) => {
    const line = analysis[beat.analysisKey]
    return `[${beat.label}] ${line}`
  }).join('\n\n')
}

export function buildMockSceneNarrations(
  analysis: ViralStructureAnalysis
): Array<{ title: string; narration: string; beatId: ViralStructureBeatId }> {
  return RETENTION_SCENE_BEATS.map((beat) => ({
    title: beat.label,
    narration: analysis[beat.analysisKey],
    beatId: beat.beatId,
  }))
}

export function isQuoteModeText(...chunks: string[]): boolean {
  const blob = chunks.filter(Boolean).join(' ')
  if (!blob.trim()) return false
  return QUOTE_MODE_PATTERNS.some((pattern) => pattern.test(blob))
}

export function viralStructurePromptFragment(analysis: ViralStructureAnalysis): string {
  const lang = languageLabel(analysis.detectedLanguage)
  return [
    `CREATOR RETENTION STRUCTURE (mandatory — NOT quote mode, NOT philosophy):`,
    `Chain: ${RETENTION_STRUCTURE_CHAIN}`,
    `Input mode: ${analysis.inputMode} · Language: ${lang} (${analysis.detectedLanguage}) — never translate.`,
    `Extracted skeleton (expand into spoken narration — do NOT copy as isolated quotes):`,
    `- hook: ${analysis.hook}`,
    `- pain: ${analysis.pain}`,
    `- emotional_problem: ${analysis.emotional_problem}`,
    `- solution: ${analysis.solution}`,
    `- proof: ${analysis.proof}`,
    `- payoff: ${analysis.payoff}`,
    `- cta: ${analysis.cta}`,
    `SCENE MAP (exactly ${CREATOR_RETENTION_SCENE_COUNT} scenes):`,
    ...RETENTION_SCENE_BEATS.map(
      (b) =>
        `Scene ${b.sceneIndex} ${b.label}: ${b.instruction} Use analysis field "${b.analysisKey}".`
    ),
    `BANNED: motivational quote spam, "You're not afraid of…", poetic one-liners, cinematic philosophy.`,
    `REQUIRED: natural spoken creator voice, retention pacing, concrete details, platform-native delivery.`,
  ].join('\n')
}
