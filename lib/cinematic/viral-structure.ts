import {
  languageLabel,
  normalizeProjectLanguage,
  type ProjectLanguage,
} from '@/lib/cinematic/language-detection'

/** Fixed scene count — matches Mugtee Script SOP six phases. */
export const CREATOR_RETENTION_SCENE_COUNT = 6

export type ViralStructureBeatId =
  | 'hook'
  | 'context_setup'
  | 'escalation'
  | 'insight_reveal'
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
    instruction:
      'Pattern interrupt, curiosity gap, emotional trigger — never a definition or essay opener.',
    analysisKey: 'hook',
  },
  {
    sceneIndex: 2,
    beatId: 'context_setup',
    label: 'Context Setup',
    instruction: 'Establish situation and tension the viewer recognizes.',
    analysisKey: 'pain',
  },
  {
    sceneIndex: 3,
    beatId: 'escalation',
    label: 'Escalation',
    instruction: 'Raise emotional intensity and curiosity — stakes climb.',
    analysisKey: 'emotional_problem',
  },
  {
    sceneIndex: 4,
    beatId: 'insight_reveal',
    label: 'Insight/Reveal',
    instruction:
      'Key lesson or unexpected realization — weave proof/example into this beat.',
    analysisKey: 'solution',
  },
  {
    sceneIndex: 5,
    beatId: 'payoff',
    label: 'Payoff',
    instruction: 'Emotional landing — what changes when they apply the insight.',
    analysisKey: 'payoff',
  },
  {
    sceneIndex: 6,
    beatId: 'cta',
    label: 'CTA',
    instruction: 'Engagement prompt — save, comment, try today. Creator-native.',
    analysisKey: 'cta',
  },
] as const

export const RETENTION_STRUCTURE_CHAIN =
  'Hook → Context Setup → Escalation → Insight/Reveal → Payoff → CTA'

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
  lang: ProjectLanguage,
  sessionSeed?: string | number
): Omit<ViralStructureAnalysis, 'inputMode' | 'detectedLanguage'> {
  const topic = subject.replace(/^["']|["']$/g, '').trim()
  const topicShort = topic.length > 56 ? `${topic.slice(0, 53)}…` : topic
  const variant = hashSeed(topic, sessionSeed, lang) % 5

  if (lang === 'hi') {
    const hinglish = /[\u0900-\u097F]/.test(topic) || /\b(kya|hai|nahi|kaise|kyun)\b/i.test(topic)
    if (hinglish) {
      return {
        hook: `${topic} — yeh galti 90% log karte hain, isliye result nahi milta.`,
        pain: `Problem yeh hai ki log shuru mein basics skip kar dete hain aur phir demotivate ho jaate hain.`,
        emotional_problem: `Agar aap bhi try kar chuke ho aur lagta hai "merse nahi hoga" — yeh normal feel hota hai.`,
        solution: `Pehle ek chhota system banao: roz 20 minute practice, ek clear outcome, aur feedback loop.`,
        proof: `Maine yahi approach use ki — 30 din mein portfolio aur confidence dono improve hue.`,
        payoff: [
          `${topicShort} पर यही मोड़ है — एक साफ कदम, महीनों की अनुमान से बेहतर।`,
          `जब ${topicShort} समझ आता है, पूरा काम हल्का लगने लगता है।`,
          `${topicShort} में असली बदलाव छोटे, ईमानदार reps से आता है — आज एक rep।`,
          `यही वजह है ${topicShort} अब overwhelm नहीं, plan लगता है।`,
          `${topicShort} पर आज एक test — कल confidence अलग दिखेगा।`,
        ][variant],
        cta: [
          `${topicShort} के लिए save करो — जिस दोस्त को यही चाहिए tag करो।`,
          `Bookmark करो, आज ${topicShort} पर एक piece try करो — comment में बताओ क्या बदला।`,
          `${topicShort} stuck friend को send करो — साथ में पहला step try करो।`,
          `Follow for more ${topicShort} — 🔥 अगर आज try कर रहे हो।`,
          `Save + next ${topicShort} session से पहले दोबारा देखो — कौन सा part hit किया?`,
        ][variant],
      }
    }
    return {
      hook: `${topic} — ज़्यादातर लोग पहला कदम गलत उठाते हैं।`,
      pain: `समस्या यह है कि बिना स्पष्ट योजना के सीखने की कोशिश करते हैं, इसलिए परिणाम नहीं मिलता।`,
      emotional_problem: `अगर आप भी हार मानने वाले थे — यह सामान्य है, आप अकेले नहीं हैं।`,
      solution: `रोज़ 20 मिनट का एक फोकस्ड रूटीन और एक छोटा लक्ष्य रखें।`,
      proof: `इसी तरीके से मैंने 30 दिन में सुधार देखा — यह काम करता है।`,
      payoff: [
        `${topicShort} — एक साफ कदम, महीनों की अनुमान से बेहतर।`,
        `जब ${topicShort} समझ आता है, काम हल्का लगने लगता है।`,
        `${topicShort} में बदलाव छोटे, ईमानदार reps से आता है।`,
        `${topicShort} अब overwhelm नहीं, plan लगता है।`,
        `${topicShort} पर आज एक test — कल confidence अलग होगा।`,
      ][variant],
      cta: [
        `${topicShort} के लिए save करें — जिसे यही चाहिए tag करें।`,
        `Bookmark करें, आज ${topicShort} पर एक piece try करें — comment में बताएं।`,
        `${topicShort} stuck दोस्त को send करें — साथ में पहला step।`,
        `Follow for more ${topicShort} — 🔥 अगर आज try कर रहे हैं।`,
        `Save + next ${topicShort} session से पहले दोबारा देखें।`,
      ][variant],
    }
  }

  const payoffTemplates = [
    (t: string) =>
      `That's the shift with ${t} — one clear move beats another month of guessing.`,
    (t: string) => `When ${t} finally clicks, the whole problem feels smaller by tonight.`,
    (t: string) => `The win with ${t} isn't hype — it's seeing your own progress stack.`,
    (t: string) => `Apply this to ${t} today and you'll feel the difference on the next rep.`,
    (t: string) => `This is how ${t} stops feeling overwhelming and starts feeling doable.`,
  ]
  const ctaTemplates = [
    (t: string) =>
      `Save this for your next ${t} session — tag someone who needs the same reset.`,
    (t: string) => `Bookmark it and test one piece on ${t} tonight. Comment what changed.`,
    (t: string) => `Send this to a friend stuck on ${t} — then try the first move together.`,
    (t: string) => `Follow for more on ${t} — drop a 🔥 if you're running this today.`,
    (t: string) => `Save + revisit before your next ${t} attempt. Which part hit hardest?`,
  ]

  return {
    hook: `Stop doing ${topic} the hard way — here's what actually works.`,
    pain: `Most people stuck on ${topic} skip the basics and wonder why nothing clicks.`,
    emotional_problem: `If you've tried before and felt like quitting — that's normal, not a sign you're bad at this.`,
    solution: `Use a simple daily loop: 20 focused minutes, one clear outcome, and quick feedback.`,
    proof: `I used this exact approach on ${topicShort} — visible progress in 30 days without burning out.`,
    payoff: payoffTemplates[variant](topicShort),
    cta: ctaTemplates[variant](topicShort),
  }
}

function extractFromLongInput(
  text: string,
  lang: ProjectLanguage,
  sessionSeed?: string | number
): Omit<ViralStructureAnalysis, 'inputMode' | 'detectedLanguage'> {
  const sentences = splitSentences(text)
  const subject = topicSubject(text.split(/\n\n/)[0] ?? text)
  const fallbacks = creatorBeatFallbacks(subject, lang, sessionSeed)

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
  /** Variation fingerprint — diversifies topic-mode fallback payoff/cta */
  sessionSeed?: string | number
}

/** Motivational templates that repeat across generations — reject in SOP validation. */
export const GENERIC_PAYOFF_CTA_PATTERNS: readonly RegExp[] = [
  /save this and try step one/i,
  /comment what you're starting with/i,
  /take one small step today/i,
  /witness the change unfold/i,
  /pick one small task/i,
  /do this today:\s*pick one small/i,
  /finish it, post or track the result/i,
  /save karo aur aaj hi step 1/i,
  /comment mein batao kya try karoge/i,
  /सेव करें और आज ही शुरू करें/i,
]

function hashSeed(...parts: (string | number | undefined)[]): number {
  const blob = parts.filter((p) => p !== undefined && p !== '').join('|')
  let h = 2166136261
  for (let i = 0; i < blob.length; i++) {
    h ^= blob.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function isGenericPayoffOrCta(text: string, topic?: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length < 4) return true
  if (GENERIC_PAYOFF_CTA_PATTERNS.some((pattern) => pattern.test(trimmed))) return true

  const topicWords = (topic ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s\u0900-\u097F]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4)
  if (topicWords.length < 2) return false

  const lower = trimmed.toLowerCase()
  const mentionsTopic = topicWords.some((w) => lower.includes(w))
  if (mentionsTopic) return false

  return /\b(today|step one|small step|save this|try step|comment what|bookmark|follow for)\b/i.test(
    trimmed
  )
}

/** Step 1 — extract creator-native skeleton from transcript, voice, topic, or story. */
export function analyzeViralStructure(input: AnalyzeViralStructureInput): ViralStructureAnalysis {
  const parts = [
    input.transcript?.trim(),
    input.voiceNote?.trim(),
    input.text.trim(),
  ].filter(Boolean) as string[]

  const combined = parts.join('\n\n').trim()
  const detectedLanguage = normalizeProjectLanguage(input.language)
  const inputMode = inferInputMode(combined)

  const beats =
    inputMode === 'topic'
      ? creatorBeatFallbacks(
          topicSubject(combined),
          detectedLanguage,
          input.sessionSeed
        )
      : extractFromLongInput(combined, detectedLanguage, input.sessionSeed)

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
    `MUGTEE SCRIPT SOP (mandatory — reel beats, NOT quote mode, NOT essay):`,
    `Chain: ${RETENTION_STRUCTURE_CHAIN}`,
    `Input mode: ${analysis.inputMode} · Language: ${lang} (${analysis.detectedLanguage}) — never translate.`,
    `Structural hints (expand into spoken narration — do NOT copy as isolated quotes):`,
    `- hook: ${analysis.hook}`,
    `- pain: ${analysis.pain}`,
    `- emotional_problem: ${analysis.emotional_problem}`,
    `- solution: ${analysis.solution}`,
    `- proof: ${analysis.proof}`,
    `- payoff_direction (write original line naming the topic — never reuse seed wording): ${analysis.payoff}`,
    `- cta_direction (write original platform CTA about this topic — never reuse seed wording): ${analysis.cta}`,
    `PAYOFF + CTA RULES: Must reference the specific topic/concrete action from the brief. Banned generic lines: "save this and try step one", "take one small step today", "comment what you're starting with", "witness the change unfold". Each generation needs fresh wording.`,
    `SCENE MAP (exactly ${CREATOR_RETENTION_SCENE_COUNT} scenes):`,
    ...RETENTION_SCENE_BEATS.map(
      (b) =>
        `Scene ${b.sceneIndex} ${b.label}: ${b.instruction} Use analysis field "${b.analysisKey}".`
    ),
    `BANNED: motivational quote spam, "You're not afraid of…", poetic one-liners, cinematic philosophy.`,
    `REQUIRED: natural spoken creator voice, retention pacing, concrete details, platform-native delivery.`,
  ].join('\n')
}
