import type { V3AgentId, V3JobRow, V3TimelineStage } from '@/types/v3/production'

/** Live production timeline — order matches the V3 pipeline spec. */
export const V3_PIPELINE_STAGES: ReadonlyArray<{
  id: string
  agent: V3AgentId | 'understanding'
  label: string
}> = [
  { id: 'understanding', agent: 'understanding', label: 'Understanding Idea' },
  { id: 'planning', agent: 'planner', label: 'Planning' },
  { id: 'research', agent: 'research', label: 'Research' },
  { id: 'script', agent: 'script', label: 'Writing Screenplay' },
  { id: 'storyboard', agent: 'storyboard', label: 'Storyboarding' },
  { id: 'character', agent: 'character', label: 'Character Design' },
  { id: 'location', agent: 'location', label: 'Location Design' },
  { id: 'style', agent: 'style', label: 'Style Direction' },
  { id: 'prompts', agent: 'prompts', label: 'Prompt Engineering' },
  { id: 'image', agent: 'image', label: 'Image Generation' },
  { id: 'video', agent: 'video', label: 'Video Generation' },
  { id: 'voice', agent: 'voice', label: 'Voice' },
  { id: 'music', agent: 'music', label: 'Music' },
  { id: 'captions', agent: 'captions', label: 'Captions' },
  { id: 'editor', agent: 'editor', label: 'Editing' },
  { id: 'quality', agent: 'quality', label: 'Quality Review' },
  { id: 'export', agent: 'export', label: 'Rendering & Export' },
]

export function buildTimelineFromJobs(
  jobs: V3JobRow[],
  currentStage: string | null
): V3TimelineStage[] {
  const jobByAgent = new Map(jobs.map((j) => [j.agent, j]))

  return V3_PIPELINE_STAGES.map((stage) => {
    if (stage.id === 'understanding') {
      return {
        ...stage,
        status: currentStage && currentStage !== 'understanding' ? 'completed' : 'completed',
      }
    }

    const job = stage.agent !== 'understanding' ? jobByAgent.get(stage.agent) : undefined
    let status: V3TimelineStage['status'] = 'pending'

    if (job) {
      if (job.status === 'completed') status = 'completed'
      else if (job.status === 'failed') status = 'failed'
      else if (job.status === 'running') status = 'running'
      else status = 'pending'
    } else if (currentStage === stage.id) {
      status = 'running'
    } else {
      const stageIdx = V3_PIPELINE_STAGES.findIndex((s) => s.id === stage.id)
      const currentIdx = V3_PIPELINE_STAGES.findIndex((s) => s.id === currentStage)
      if (currentIdx > stageIdx && currentIdx >= 0) status = 'completed'
    }

    return {
      id: stage.id,
      agent: stage.agent,
      label: stage.label,
      status,
      error: job?.error ?? null,
    }
  })
}
