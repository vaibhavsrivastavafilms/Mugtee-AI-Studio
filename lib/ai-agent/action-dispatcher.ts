import type { CommandIntent } from '@/lib/ai-agent/types'
import { isRegisteredTool, type MugteeToolName } from '@/lib/ai-agent/tool-registry'

export type DispatchPlan = {
  kind: 'workflow' | 'tools' | 'navigate'
  tools: MugteeToolName[]
  goal: string
  href?: string
}

const INTENT_TOOL_MAP: Record<string, MugteeToolName[]> = {
  create_project: ['searchMemory', 'createProject', 'generateScript', 'generateHooks'],
  create_reel: [
    'searchMemory',
    'createProject',
    'generateInstagramReel',
    'generateHooks',
    'generateStoryboard',
    'generateVoiceover',
    'generateCaption',
  ],
  create_youtube: ['searchMemory', 'createProject', 'generateYouTubeScript', 'generateShotlist'],
  create_podcast: ['searchMemory', 'generatePodcastOutline'],
  create_campaign: ['searchMemory', 'generateCampaign', 'generateCalendar'],
  create_carousel: ['searchMemory', 'generateCarousel', 'generateCaption'],
  brand_strategy: ['searchMemory', 'generateBrandStrategy'],
  open_project: ['searchProjects', 'openProject'],
  save_project: ['saveProject'],
  publish: ['publishProject', 'generateCaption'],
  search: ['searchMemory', 'searchProjects'],
  calendar: ['searchMemory', 'generateCalendar'],
  thumbnail: ['generateThumbnailIdeas'],
  shotlist: ['generateShotlist'],
  table_tales_post: [
    'searchMemory',
    'generateCalendar',
    'generateInstagramReel',
    'generateCaption',
  ],
}

function normalizeIntentKey(intent: string): string {
  return intent
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

/** Map structured intent → whitelisted tools or full workflow. */
export function dispatchIntent(
  intent: CommandIntent,
  fallbackGoal: string
): DispatchPlan {
  const key = normalizeIntentKey(intent.intent)
  const goal = String(intent.args.topic ?? intent.args.goal ?? fallbackGoal).trim() || fallbackGoal

  if (key === 'navigate_assets' || key === 'asset_search') {
    const q = String(intent.args.query ?? goal)
    return { kind: 'navigate', tools: [], goal, href: `/studio/assets?q=${encodeURIComponent(q)}` }
  }

  const mapped = INTENT_TOOL_MAP[key]
  if (mapped?.length) {
    const single = intent.args.tool
    if (typeof single === 'string' && isRegisteredTool(single)) {
      return { kind: 'tools', tools: [single], goal }
    }
    const isFullPipeline =
      mapped.length >= 4 ||
      ['create_reel', 'create_project', 'create_youtube', 'table_tales_post'].includes(key)
    return {
      kind: isFullPipeline ? 'workflow' : 'tools',
      tools: mapped.filter(isRegisteredTool),
      goal,
    }
  }

  const argTool = intent.args.tool
  if (typeof argTool === 'string' && isRegisteredTool(argTool)) {
    return { kind: 'tools', tools: [argTool], goal }
  }

  if (/open.*project|latest project/.test(goal.toLowerCase())) {
    return { kind: 'tools', tools: ['searchProjects', 'openProject'], goal }
  }

  return {
    kind: 'workflow',
    tools: INTENT_TOOL_MAP.create_reel,
    goal,
  }
}
