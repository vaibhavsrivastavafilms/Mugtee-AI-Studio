import { v4 as uuidv4 } from 'uuid'
import {
  CONTENT_ANGLES,
  CONTENT_ANGLE_IDS,
  type ContentAngleId,
} from '@/lib/cinematic/content-angle-engine'
import type { StoryDirectionOption } from '@/lib/director/types'

function hashSeed(topic: string, sessionSeed?: string | number): number {
  const raw = `${topic}:${sessionSeed ?? ''}`
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0
  return h
}

/** Pick 3 distinct content angles — never repeats within one generation batch. */
export function pickStoryDirectionAngles(
  topic: string,
  usedAngleIds: ContentAngleId[] = [],
  sessionSeed?: string | number
): ContentAngleId[] {
  const used = new Set(usedAngleIds)
  const pool = [...CONTENT_ANGLE_IDS.filter((id) => !used.has(id))]
  const seed = hashSeed(topic, sessionSeed)
  const picked: ContentAngleId[] = []
  let cursor = seed % Math.max(pool.length, 1)

  while (picked.length < 3 && pool.length > 0) {
    const idx = cursor % pool.length
    const id = pool[idx]!
    if (!picked.includes(id)) picked.push(id)
    pool.splice(idx, 1)
    cursor += 7
  }

  if (picked.length < 3) {
    for (const id of CONTENT_ANGLE_IDS) {
      if (picked.length >= 3) break
      if (!picked.includes(id) && !used.has(id)) picked.push(id)
    }
  }

  return picked.slice(0, 3)
}

function titleFromAngle(angleId: ContentAngleId, topic: string): string {
  const angle = CONTENT_ANGLES[angleId]
  const short = topic.trim().slice(0, 48) || 'your story'
  return `${angle.label}: ${short}`
}

/** Build three cinematic story direction cards from topic + angles (no LLM required). */
export function buildStoryDirectionOptions(
  topic: string,
  angleIds: ContentAngleId[],
  sessionSeed?: string | number
): StoryDirectionOption[] {
  const seed = hashSeed(topic, sessionSeed)
  return angleIds.map((angleId, i) => {
    const angle = CONTENT_ANGLES[angleId]
    const variant = (seed + i * 13) % 997
    return {
      id: uuidv4(),
      angleId,
      title: titleFromAngle(angleId, topic),
      logline: `${angle.directive} Applied to: ${topic.trim() || 'untitled project'}.`,
      hook: `Open with a ${angle.label.toLowerCase()} frame — beat ${variant % 60}s retention.`,
      emotionalPromise: `Deliver ${angle.label} tension with a clear payoff for the audience.`,
      audience: `Viewers who respond to ${angle.label} storytelling on short-form video.`,
    }
  })
}

export function generateStoryDirections(
  topic: string,
  options?: { usedAngleIds?: ContentAngleId[]; sessionSeed?: string | number }
): StoryDirectionOption[] {
  const angles = pickStoryDirectionAngles(
    topic,
    options?.usedAngleIds ?? [],
    options?.sessionSeed
  )
  return buildStoryDirectionOptions(topic, angles, options?.sessionSeed)
}
