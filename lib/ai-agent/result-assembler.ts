import type { AgentTask, ProjectPackage } from '@/lib/ai-agent/types'

export function assembleProjectPackage(
  goal: string,
  tasks: AgentTask[],
  projectId?: string
): ProjectPackage {
  const pkg: ProjectPackage = { goal, projectId, metadata: {} }

  for (const task of tasks) {
    if (task.status !== 'completed' || !task.output) continue
    const out = task.output as Record<string, unknown>
    if (typeof out.projectId === 'string') pkg.projectId = out.projectId
    if (typeof out.script === 'string') pkg.script = out.script
    if (Array.isArray(out.hooks)) pkg.hooks = out.hooks as string[]
    if (out.storyboard) pkg.storyboard = out.storyboard
    if (out.voiceover && typeof out.voiceover === 'object') {
      const v = out.voiceover as { audioUrl?: string | null; mock?: boolean; provider?: string }
      pkg.voiceover = {
        audioUrl: v.audioUrl,
        mock: v.mock,
        provider: v.provider,
      }
    }
    if (Array.isArray(out.captions)) pkg.captions = out.captions as string[]
    if (Array.isArray(out.calendar)) pkg.calendar = out.calendar as string[]
  }

  return pkg
}
