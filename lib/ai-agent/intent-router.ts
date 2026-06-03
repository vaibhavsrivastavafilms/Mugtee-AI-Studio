import { z } from 'zod'
import type { GoalAnalysis } from '@/lib/ai-agent/types'
import { CommandIntentSchema, type CommandIntent } from '@/lib/ai-agent/types'
import { callStructuredJson } from '@/lib/ai-agent/structured-llm'
import { TOOL_NAMES } from '@/lib/ai-agent/tool-registry'

export type RoutedIntent = {
  primary:
    | 'create_content'
    | 'research'
    | 'publish'
    | 'organize'
    | 'business_grow'
    | 'business_exec'
    | 'unknown'
  tools: string[]
  confidence: number
}

const INTENT_TOOL_MAP: Record<RoutedIntent['primary'], string[]> = {
  create_content: [
    'createProject',
    'generateScript',
    'generateInstagramReel',
    'generateHooks',
    'generateStoryboard',
    'generateVoiceover',
    'generateCaption',
  ],
  research: ['searchMemory', 'searchProjects', 'searchAssets', 'findAsset'],
  publish: ['publishProject', 'generateCaption', 'generateCalendar'],
  organize: ['searchProjects', 'openProject', 'saveProject', 'generateCalendar'],
  business_grow: [
    'businessGrow',
    'businessCampaignFromContent',
    'searchAssets',
    'searchMemory',
  ],
  business_exec: ['businessExecutiveReview', 'businessGrow', 'businessLeads', 'businessRevenue'],
  unknown: ['createProject', 'generateScript', 'searchMemory'],
}

export function routeIntent(analysis: GoalAnalysis): RoutedIntent {
  const g = `${analysis.goal} ${analysis.intent}`.toLowerCase()
  let primary: RoutedIntent['primary'] = 'create_content'
  let confidence = 0.7

  if (/act as my coo|executive review|coo mode|weekly executive/.test(g)) {
    primary = 'business_exec'
    confidence = 0.92
  } else if (/help me grow|grow mugtee|growth strategy|business os/.test(g)) {
    primary = 'business_grow'
    confidence = 0.9
  } else if (/lead funnel|capture leads|nurture leads|business leads/.test(g)) {
    primary = 'business_grow'
    confidence = 0.85
  } else if (/revenue|monetiz|₹|inr|offers|clients goal/.test(g)) {
    primary = 'business_exec'
    confidence = 0.82
  } else if (/calendar|schedule|plan week|posting plan|table tales|tomorrow/.test(g)) {
    primary = 'publish'
    confidence = 0.85
  } else if (/search|find project|open project|latest project|library/.test(g)) {
    primary = 'organize'
    confidence = 0.8
  } else if (/research|competitor|trend|analyze/.test(g)) {
    primary = 'research'
    confidence = 0.75
  } else if (/reel|script|video|storyboard|voice|hook|viral|create|instagram|youtube|podcast/.test(g)) {
    primary = 'create_content'
    confidence = 0.9
  } else {
    primary = 'unknown'
    confidence = 0.5
  }

  return { primary, tools: INTENT_TOOL_MAP[primary], confidence }
}

const LlmIntentSchema = z.object({
  intent: z.string(),
  args: z.object({}).catchall(z.unknown()).default({}),
  confidence: z.number().min(0).max(1).optional(),
})

/** OpenAI structured output: always JSON { intent, args }. */
export async function analyzeCommandIntent(
  command: string,
  memoryContext?: string
): Promise<CommandIntent> {
  const raw = await callStructuredJson<z.infer<typeof LlmIntentSchema>>({
    system: `You are MugteeOS intent router. Classify creator commands into intents and extract args.
Use intents like: create_reel, create_project, open_project, save_project, publish, calendar, brand_strategy, create_youtube, create_podcast, create_campaign, create_carousel, table_tales_post, search, thumbnail, shotlist.
Put topic/goal in args.topic. Put projectId in args.projectId when mentioned. Put platform in args.platform when clear.`,
    user: `Command: ${command}\n\nCreator memory:\n${memoryContext?.slice(0, 2000) ?? 'none'}\n\nAllowed tools: ${TOOL_NAMES.join(', ')}`,
    schemaHint: '{"intent":"create_reel","args":{"topic":"..."},"confidence":0.9}',
    max_tokens: 400,
  })

  const parsed = LlmIntentSchema.parse(raw)
  return CommandIntentSchema.parse(parsed)
}
