import type { MugteeAgent } from '@/lib/automation-engine/types'

export const MUGTEE_AGENTS: MugteeAgent[] = [
  {
    id: 'research',
    name: 'Research Agent',
    role: 'research',
    description: 'Trend research, competitor scans, and audience signals.',
    capabilities: ['deep_research', 'trend_analysis', 'competitor_scan'],
  },
  {
    id: 'strategy',
    name: 'Strategy Agent',
    role: 'strategy',
    description: 'Campaign planning, calendars, and growth recommendations.',
    capabilities: ['content_calendar', 'campaign_plan', 'analytics_review'],
  },
  {
    id: 'writer',
    name: 'Writer Agent',
    role: 'writer',
    description: 'Hooks, scripts, captions, and hashtags.',
    capabilities: ['hook', 'script', 'caption', 'hashtags'],
  },
  {
    id: 'storyboard',
    name: 'Storyboard Agent',
    role: 'storyboard',
    description: 'Scene cards, shot lists, and visual sequencing.',
    capabilities: ['storyboard', 'shot_list', 'scene_plan'],
  },
  {
    id: 'designer',
    name: 'Designer Agent',
    role: 'designer',
    description: 'Image prompts, thumbnails, and visual direction.',
    capabilities: ['image_prompt', 'thumbnail', 'visual_bible'],
  },
  {
    id: 'video',
    name: 'Video Agent',
    role: 'video',
    description: 'Motion prompts, assembly, and render orchestration.',
    capabilities: ['veo_prompt', 'video_assembly', 'render'],
  },
  {
    id: 'voice',
    name: 'Voice Agent',
    role: 'voice',
    description: 'Narration scripts and voice synthesis.',
    capabilities: ['voice_script', 'tts'],
  },
  {
    id: 'publishing',
    name: 'Publishing Agent',
    role: 'publishing',
    description: 'Scheduling, platform formatting, and publish handoff.',
    capabilities: ['schedule', 'publish', 'resize'],
  },
  {
    id: 'analytics',
    name: 'Analytics Agent',
    role: 'analytics',
    description: 'Performance collection and iteration recommendations.',
    capabilities: ['metrics', 'reports', 'recommendations'],
  },
  {
    id: 'memory',
    name: 'Memory Agent',
    role: 'memory',
    description: 'Brand memory injection and cross-project context.',
    capabilities: ['brand_memory', 'context_merge'],
  },
]

export function getAgentById(id: string): MugteeAgent | undefined {
  return MUGTEE_AGENTS.find((a) => a.id === id)
}
