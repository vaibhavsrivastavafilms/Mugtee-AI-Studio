import type { GeneratedScene } from '@/lib/cinematic/generation'

/** Align first scene visual language with the emotional hook. */
export function alignOpeningSceneWithHook(
  scenes: GeneratedScene[],
  hook: string
): GeneratedScene[] {
  if (!scenes.length || !hook.trim()) return scenes

  const first = scenes[0]
  const hookLower = hook.toLowerCase()
  const emotionalCue =
    hookLower.includes('never') || hookLower.includes('afraid')
      ? 'intimate tension, withheld emotion'
      : hookLower.includes('?')
        ? 'visual question, negative space'
        : 'opening stillness, emotional weight'

  const visualPrompt = first.visualPrompt.includes(emotionalCue)
    ? first.visualPrompt
    : `${first.visualPrompt}. ${emotionalCue}.`

  return [
    {
      ...first,
      visualPrompt: visualPrompt.slice(0, 480),
      movementStyle: first.movementStyle || 'slow push-in',
    },
    ...scenes.slice(1),
  ]
}

export function hookVisualArchitecture(hook: string): {
  framing: string
  movement: string
  lighting: string
} {
  const h = hook.toLowerCase()
  if (/\b(close|intimate|quiet|whisper)\b/.test(h)) {
    return {
      framing: 'tight portrait or detail frame',
      movement: 'barely perceptible push-in',
      lighting: 'single warm key, deep shadow',
    }
  }
  if (/\b(wide|world|city|landscape)\b/.test(h)) {
    return {
      framing: 'environmental wide with subject in lower third',
      movement: 'slow drift',
      lighting: 'natural atmospheric depth',
    }
  }
  return {
    framing: 'off-center subject, cinematic negative space',
    movement: 'controlled slow movement',
    lighting: 'motivated practical light, restrained contrast',
  }
}
