import type { V3CreatorMemory } from '@/lib/pipeline/v3-types'

const MAX_PREFERRED_HOOKS = 12

function clip(value: string, max: number): string {
  const t = value.trim()
  return t.length > max ? t.slice(0, max) : t
}

export type V3MemoryUpdateInput = {
  hook?: string
  niche?: string
  tone?: string
  visualStyle?: string
  pacing?: string
  creatorStyle?: string
}

/** Extend creator memory with V3 preferences — merges with lib/memory/creator-dna. */
export function updateV3CreatorMemory(
  existing: V3CreatorMemory | null | undefined,
  input: V3MemoryUpdateInput
): V3CreatorMemory {
  const base = existing ?? {}
  const preferredHooks = [...(base.preferredHooks ?? [])]

  if (input.hook?.trim()) {
    const hook = clip(input.hook, 280)
    if (!preferredHooks.some((h) => h.toLowerCase() === hook.toLowerCase())) {
      preferredHooks.unshift(hook)
    }
  }

  return {
    creatorStyle: input.creatorStyle ?? input.tone ?? base.creatorStyle,
    preferredHooks: preferredHooks.slice(0, MAX_PREFERRED_HOOKS),
    niche: input.niche ?? base.niche,
    pacing: input.pacing ?? base.pacing,
    visualStyle: input.visualStyle ?? base.visualStyle,
    updatedAt: new Date().toISOString(),
  }
}

/** Build prompt injection from V3 creator memory. */
export function formatV3MemoryForPrompt(memory: V3CreatorMemory | null | undefined): string {
  if (!memory) return ''
  const lines = [
    memory.creatorStyle ? `Creator style: ${memory.creatorStyle}` : '',
    memory.niche ? `Niche: ${memory.niche}` : '',
    memory.pacing ? `Preferred pacing: ${memory.pacing}` : '',
    memory.visualStyle ? `Visual style: ${memory.visualStyle}` : '',
    memory.preferredHooks?.length
      ? `Recent hooks (avoid repeating):\n${memory.preferredHooks.slice(0, 5).map((h) => `- ${h}`).join('\n')}`
      : '',
  ].filter(Boolean)
  if (!lines.length) return ''
  return ['CREATOR MEMORY (V3):', ...lines].join('\n')
}

export function parseV3CreatorMemory(raw: unknown): V3CreatorMemory | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const hooks = Array.isArray(o.preferredHooks)
    ? o.preferredHooks
        .filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
        .map((h) => clip(h, 280))
        .slice(0, MAX_PREFERRED_HOOKS)
    : undefined
  return {
    creatorStyle: clip(String(o.creatorStyle ?? ''), 80) || undefined,
    preferredHooks: hooks,
    niche: clip(String(o.niche ?? ''), 80) || undefined,
    pacing: clip(String(o.pacing ?? ''), 80) || undefined,
    visualStyle: clip(String(o.visualStyle ?? ''), 120) || undefined,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : undefined,
  }
}
