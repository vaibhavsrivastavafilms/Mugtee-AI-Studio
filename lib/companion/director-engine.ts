import { MUGTEE_DIRECTOR_VOICE_RULES } from '@/lib/mugtee/personality'
import type { CreativeBrief, DirectorNote } from '@/lib/companion/types'
import { DIRECTOR_NOTE_SESSION_CAP } from '@/lib/companion/types'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { hasScriptGenerationKey } from '@/lib/ai/script-generation-keys'
import { FREE_OPENAI_CHAT_MODEL } from '@/lib/ai/free-tier'

export type DirectorContext = {
  hook?: string
  script?: string
  title?: string
  style?: string
  sceneLabel?: string
  generationStep?: string
}

const RULE_BASED_NOTES: Array<{
  when: (ctx: DirectorContext) => boolean
  text: string
}> = [
  {
    when: (ctx) => Boolean(ctx.hook && ctx.hook.length > 20 && !ctx.script),
    text: 'Hook lands — don\'t bury the tension. Let the first scene breathe on it.',
  },
  {
    when: (ctx) => Boolean(ctx.script && ctx.script.length > 200),
    text: 'Middle\'s carrying weight. One visual cut per beat keeps retention honest.',
  },
  {
    when: (ctx) => ctx.generationStep === 'scenes' || Boolean(ctx.sceneLabel),
    text: 'Frame the emotion before the information — eyes follow feeling first.',
  },
  {
    when: (ctx) => ctx.style === 'documentary' || ctx.style === 'emotional',
    text: 'Documentary truth: silence between lines is a character. Use it.',
  },
  {
    when: () => true,
    text: 'You\'re building a film, not filling a template. Trust the brief.',
  },
]

function pickRuleNote(ctx: DirectorContext, existing: DirectorNote[]): string {
  const used = new Set(existing.map((n) => n.text))
  for (const rule of RULE_BASED_NOTES) {
    if (rule.when(ctx) && !used.has(rule.text)) return rule.text
  }
  return RULE_BASED_NOTES[RULE_BASED_NOTES.length - 1].text
}

async function generateOpenAIDirectorNote(
  ctx: DirectorContext,
  brief?: CreativeBrief | null
): Promise<string | null> {
  if (!hasScriptGenerationKey()) return null
  try {
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: FREE_OPENAI_CHAT_MODEL,
      temperature: 0.85,
      max_tokens: 80,
      messages: [
        {
          role: 'system',
          content: `${MUGTEE_DIRECTOR_VOICE_RULES}\nOne short director note. Max 22 words. No quotes.`,
        },
        {
          role: 'user',
          content: [
            brief?.theme ? `Theme: ${brief.theme}` : '',
            brief?.emotion ? `Emotion: ${brief.emotion}` : '',
            ctx.title ? `Title: ${ctx.title}` : '',
            ctx.hook ? `Hook: ${ctx.hook.slice(0, 200)}` : '',
            ctx.sceneLabel ? `Scene: ${ctx.sceneLabel}` : '',
            ctx.generationStep ? `Stage: ${ctx.generationStep}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    })
    const text = completion.choices[0]?.message?.content?.trim()
    return text && text.length <= 160 ? text : null
  } catch {
    return null
  }
}

export function canAddDirectorNote(
  sessionCounts: Record<string, number>,
  sessionId: string
): boolean {
  return (sessionCounts[sessionId] ?? 0) < DIRECTOR_NOTE_SESSION_CAP
}

export function incrementSessionCount(
  sessionCounts: Record<string, number>,
  sessionId: string
): Record<string, number> {
  return {
    ...sessionCounts,
    [sessionId]: (sessionCounts[sessionId] ?? 0) + 1,
  }
}

export async function generateDirectorNote(
  ctx: DirectorContext,
  existing: DirectorNote[],
  brief?: CreativeBrief | null,
  preferAi = true
): Promise<string> {
  if (preferAi) {
    const ai = await generateOpenAIDirectorNote(ctx, brief)
    if (ai) return ai
  }
  return pickRuleNote(ctx, existing)
}

function noteId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function createDirectorNoteRecord(
  text: string,
  sessionId: string,
  sceneRef?: string | null
): DirectorNote {
  return {
    id: noteId(),
    text: text.trim().slice(0, 280),
    sceneRef: sceneRef ?? null,
    createdAt: new Date().toISOString(),
    sessionId,
  }
}

export function parseDirectorNotes(raw: unknown): DirectorNote[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((n) => n && typeof n === 'object')
    .map((n) => {
      const o = n as Record<string, unknown>
      return {
        id: typeof o.id === 'string' ? o.id : noteId(),
        text: typeof o.text === 'string' ? o.text.slice(0, 280) : '',
        sceneRef: typeof o.sceneRef === 'string' ? o.sceneRef : null,
        createdAt:
          typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
        sessionId: typeof o.sessionId === 'string' ? o.sessionId : 'default',
      }
    })
    .filter((n) => n.text.length > 0)
}

export function parseSessionCounts(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && v >= 0) out[k] = Math.floor(v)
  }
  return out
}
