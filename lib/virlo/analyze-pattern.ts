import { STORY_FRAMEWORK_IDS, type StoryFrameworkId } from '@/lib/ai/prompts/director/story-frameworks'
import { generateScriptViaRouter, hasAnyTextProviderKey } from '@/lib/ai/providers/generation-bridge'
import { parseLlmJsonText } from '@/lib/ai/providers/shared'
import { classifyFramework } from '@/lib/virlo/framework-classifier'
import { analyzeHook } from '@/lib/virlo/hook-analyzer'
import { analyzeEmotion } from '@/lib/virlo/emotion-analyzer'
import { analyzeRetention } from '@/lib/virlo/retention-analyzer'
import { computeVirloScores } from '@/lib/virlo/scoring'
import type {
  EmotionType,
  HookType,
  PlatformId,
  VirloAnalysis,
  VirloAnalyzeInput,
} from '@/lib/virlo/types'

const ANALYSIS_SYSTEM = `You are Virlo — a viral content pattern analyst for short-form video. Analyze the provided content snippet and return ONLY valid JSON:
{
  "platform": "tiktok|instagram|youtube-shorts|x|linkedin",
  "topic": "string",
  "framework": "belief-shift|transformation-story|failure-to-wisdom|experiment-story|contrarian-reveal|creator-spotlight|routine-rewrite",
  "hookType": "curiosity|contrarian|warning|question|number|story",
  "emotion": "curiosity|surprise|fear|inspiration|humor|anger|empathy",
  "curiosityTrigger": "string — the opening curiosity gap",
  "retentionStrategy": "string — pattern interrupts, open loops, tension, reveals",
  "scores": {
    "viralityScore": 0-100,
    "retentionScore": 0-100,
    "shareabilityScore": 0-100,
    "saveabilityScore": 0-100,
    "storyQualityScore": 0-100,
    "frameworkConfidence": 0-100
  }
}
Be specific to the content. No markdown.`

function heuristicAnalysis(
  content: string,
  platform?: string,
  topic?: string
): VirloAnalysis {
  const fw = classifyFramework(content, { niche: topic })
  const hook = analyzeHook(content, topic)
  const emotion = analyzeEmotion(content)
  const retention = analyzeRetention(content)

  const hasPersonalStory = /\b(i |my |when i)\b/i.test(content)
  const hasSpecificity = /\b(\d+|specific|exactly|only|because)\b/i.test(content)

  const scores = computeVirloScores({
    retentionScore: retention.retentionScore,
    hookConfidence: hook.confidence,
    frameworkConfidence: fw.confidence,
    emotionConfidence: emotion.confidence,
    contentLength: content.length,
    hasPersonalStory,
    hasSpecificity,
  })

  return {
    platform: platform || 'tiktok',
    topic: topic || content.slice(0, 80),
    framework: fw.framework,
    hookType: hook.hookType,
    emotion: emotion.emotion,
    curiosityTrigger: hook.curiosityTrigger,
    retentionStrategy: retention.retentionStrategy,
    scores,
    source: 'heuristic',
  }
}

async function llmAnalysis(
  content: string,
  platform?: string,
  topic?: string
): Promise<VirloAnalysis | null> {
  if (!hasAnyTextProviderKey()) return null

  const userPrompt = [
    platform ? `PLATFORM: ${platform}` : '',
    topic ? `TOPIC: ${topic}` : '',
    `CONTENT:\n${content.slice(0, 3000)}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const result = await generateScriptViaRouter({
      systemPrompt: ANALYSIS_SYSTEM,
      userPrompt,
      topic: topic || content.slice(0, 120),
      temperature: 0.5,
      contextInput: { topic: topic || content.slice(0, 120), platform },
    })

    const parsed = parseLlmJsonText(JSON.stringify(result.parsed)) as Record<string, unknown>
    const framework = String(parsed.framework || '') as StoryFrameworkId
    if (!STORY_FRAMEWORK_IDS.includes(framework)) return null

    const scoresRaw = (parsed.scores ?? parsed) as Record<string, unknown>
    const clamp = (n: unknown) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)))

    return {
      platform: String(parsed.platform || platform || 'tiktok') as PlatformId,
      topic: String(parsed.topic || topic || content.slice(0, 80)),
      framework,
      hookType: String(parsed.hookType || 'curiosity') as HookType,
      emotion: String(parsed.emotion || 'curiosity') as EmotionType,
      curiosityTrigger: String(parsed.curiosityTrigger || ''),
      retentionStrategy: String(parsed.retentionStrategy || ''),
      scores: {
        viralityScore: clamp(scoresRaw.viralityScore),
        retentionScore: clamp(scoresRaw.retentionScore),
        shareabilityScore: clamp(scoresRaw.shareabilityScore),
        saveabilityScore: clamp(scoresRaw.saveabilityScore),
        storyQualityScore: clamp(scoresRaw.storyQualityScore),
        frameworkConfidence: clamp(scoresRaw.frameworkConfidence),
      },
      source: 'llm',
      rawAnalysis: parsed,
    }
  } catch {
    return null
  }
}

/** Main orchestrator: content/metadata → full Virlo analysis. */
export async function analyzePattern(input: VirloAnalyzeInput): Promise<VirloAnalysis> {
  const content = [input.content, input.urlSnippet].filter(Boolean).join('\n').trim()
  if (!content) {
    throw new Error('content or urlSnippet required')
  }

  const llm = await llmAnalysis(content, input.platform, input.topic)
  if (llm?.curiosityTrigger && llm.scores.viralityScore > 0) {
    return llm
  }

  return heuristicAnalysis(content, input.platform, input.topic)
}

/** Build analysis from a seeded DB pattern (no LLM). */
export function analysisFromSeedPattern(pattern: {
  platform: string
  topic: string
  framework: string
  hook_type: string | null
  emotion: string | null
  curiosity_trigger: string | null
  retention_strategy: string | null
  virality_score: number
  shareability_score: number
  saveability_score: number
  story_quality_score: number
  framework_confidence: number
  raw_analysis?: Record<string, unknown>
}): VirloAnalysis {
  const retention = analyzeRetention(
    [pattern.retention_strategy, pattern.curiosity_trigger, pattern.topic].filter(Boolean).join(' ')
  )

  return {
    platform: pattern.platform,
    topic: pattern.topic,
    framework: pattern.framework as StoryFrameworkId,
    hookType: (pattern.hook_type || 'curiosity') as HookType,
    emotion: (pattern.emotion || 'curiosity') as EmotionType,
    curiosityTrigger: pattern.curiosity_trigger || pattern.topic,
    retentionStrategy: pattern.retention_strategy || retention.retentionStrategy,
    scores: {
      viralityScore: pattern.virality_score,
      retentionScore: retention.retentionScore,
      shareabilityScore: pattern.shareability_score,
      saveabilityScore: pattern.saveability_score,
      storyQualityScore: pattern.story_quality_score,
      frameworkConfidence: pattern.framework_confidence,
    },
    source: 'seed',
    rawAnalysis: pattern.raw_analysis,
  }
}
