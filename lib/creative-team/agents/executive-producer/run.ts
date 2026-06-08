import { STORY_FRAMEWORKS } from '@/lib/ai/prompts/director/story-frameworks'
import { runProducerAnalysis } from '@/lib/director/producer/producer-engine'
import type { ProducerAnalysisInput } from '@/lib/director/producer/types'
import type { AgentReport, CreativeTeamContext } from '@/lib/creative-team/types'
import type { ProducerReport } from '@/lib/director/producer/types'

/** Delegates to lib/director/producer/producer-engine. */
export async function runExecutiveProducer(ctx: CreativeTeamContext): Promise<AgentReport<ProducerReport>> {
  const fw = ctx.activeFramework
  const fwDef = fw ? STORY_FRAMEWORKS[fw.framework] : null

  const input: ProducerAnalysisInput = {
    idea: ctx.idea,
    storyDirection: ctx.storyDirection
      ? {
          title: ctx.storyDirection.title,
          logline: ctx.storyDirection.logline,
          hook: ctx.storyDirection.hook,
          emotionalPromise: ctx.storyDirection.emotionalPromise,
          audience: ctx.storyDirection.audience,
        }
      : null,
    framework: fw
      ? {
          label: fwDef?.label ?? fw.frameworkName,
          coreEmotion: fw.coreEmotion,
          audienceDesire: fw.audienceDesire,
          narrativeTension: fw.narrativeTension,
          curiosityGap: fw.curiosityGap,
          transformation: fw.transformation,
        }
      : null,
    frameworkAnalysis: ctx.frameworkAnalysis
      ? {
          act1: ctx.frameworkAnalysis.act1,
          act2: ctx.frameworkAnalysis.act2,
          conflict: ctx.frameworkAnalysis.conflict,
          escalation: ctx.frameworkAnalysis.escalation,
          breakthrough: ctx.frameworkAnalysis.breakthrough,
          resolution: ctx.frameworkAnalysis.resolution,
        }
      : null,
    directorTreatment: ctx.directorTreatment
      ? {
          genre: ctx.directorTreatment.genre,
          mood: ctx.directorTreatment.mood,
          emotionalArc: ctx.directorTreatment.emotionalArc,
          visualStyle: ctx.directorTreatment.visualStyle,
          cameraLanguage: ctx.directorTreatment.cameraLanguage,
          colorPalette: ctx.directorTreatment.colorPalette,
        }
      : null,
    blueprint: ctx.blueprint
      ? {
          title: ctx.blueprint.title,
          hook: ctx.blueprint.hook,
          summary: ctx.blueprint.summary,
          script: ctx.blueprint.script,
        }
      : null,
    creatorDna: ctx.creatorDna,
    directorMemoryPrompt: ctx.directorMemoryPrompt,
    producerMemoryPrompt: ctx.producerMemoryPrompt,
    virloMarketPrompt: ctx.virloMarketPrompt,
  }

  const raw = await runProducerAnalysis(input)
  const now = new Date().toISOString()
  const report: ProducerReport = {
    ...raw,
    id: crypto.randomUUID(),
    projectId: ctx.projectId,
    userId: ctx.userId,
    createdAt: now,
    updatedAt: now,
  }

  const topStrength = report.recommendations.strengths[0]?.text
  const topRisk = report.recommendations.risks[0]?.text

  return {
    agentId: 'executive-producer',
    title: 'Producer Report',
    summary: `${report.readinessLabel} — readiness ${report.storyReadinessScore}/100`,
    preview: topStrength ?? topRisk ?? 'Executive producer review complete',
    payload: report,
    generatedAt: new Date().toISOString(),
  }
}
