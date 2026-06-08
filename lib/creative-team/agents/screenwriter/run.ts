import { STORY_FRAMEWORK_IDS, STORY_FRAMEWORKS } from '@/lib/ai/prompts/director/story-frameworks'
import type { StoryFrameworkId } from '@/lib/ai/prompts/director/story-frameworks'
import {
  blueprintFromFramework,
  buildFrameworkAnalysis,
} from '@/lib/director/blueprint-from-framework'
import { routeCreativeTeamPrompt } from '@/lib/creative-team/prompt-router'
import type { AgentReport, CreativeTeamContext, ScreenwriterPayload } from '@/lib/creative-team/types'
import {
  SCREENWRITER_SYSTEM,
  buildScreenwriterUserPrompt,
} from '@/lib/creative-team/agents/screenwriter/prompts'

/** Wraps blueprint-from-framework + Story Director package hints. */
export async function runScreenwriter(ctx: CreativeTeamContext): Promise<AgentReport<ScreenwriterPayload>> {
  const rawFramework =
    ctx.activeFramework?.framework ??
    (ctx.priorReports?.['story-strategist']?.payload as { recommendations?: { framework: string }[] })
      ?.recommendations?.[0]?.framework

  const frameworkId = rawFramework as StoryFrameworkId | undefined

  if (!frameworkId || !STORY_FRAMEWORK_IDS.includes(frameworkId)) {
    const emptyBlueprint = ctx.blueprint ?? {
      title: ctx.storyDirection?.title ?? 'Untitled',
      hook: ctx.storyDirection?.hook ?? '',
      summary: ctx.storyDirection?.logline ?? '',
      script: '',
      sceneBeats: [],
      locked: false,
      approved: false,
    }
    return {
      agentId: 'screenwriter',
      title: 'Blueprint Package',
      summary: 'Awaiting framework selection',
      preview: emptyBlueprint.hook || 'Select a story framework first',
      payload: {
        blueprint: emptyBlueprint,
        frameworkAnalysis: ctx.frameworkAnalysis ?? buildFrameworkAnalysis('belief-shift', ctx.storyDirection, ctx.idea),
        storyPackageHint: null,
      },
      generatedAt: new Date().toISOString(),
    }
  }

  const fwId = frameworkId
  const analysis =
    ctx.frameworkAnalysis ?? buildFrameworkAnalysis(fwId, ctx.storyDirection, ctx.idea)
  let blueprint = blueprintFromFramework({
    frameworkId: fwId,
    analysis,
    storyDirection: ctx.storyDirection,
    treatment: ctx.directorTreatment,
    prev: ctx.blueprint,
  })

  const fw = STORY_FRAMEWORKS[fwId]
  const llm = await routeCreativeTeamPrompt({
    systemPrompt: SCREENWRITER_SYSTEM,
    userPrompt: buildScreenwriterUserPrompt({
      title: blueprint.title,
      hook: blueprint.hook,
      summary: blueprint.summary,
      frameworkLabel: fw.label,
    }),
    topic: ctx.idea,
    ctx,
  })

  const hookRefinement = String(llm?.parsed.hookRefinement ?? '').trim()
  if (hookRefinement.length > 8) {
    blueprint = { ...blueprint, hook: hookRefinement }
  }

  const beatNotes = (llm?.parsed.beatNotes as string[] | undefined)?.filter(Boolean) ?? []
  const storyPackageHint = {
    frameworkId: fwId,
    title: blueprint.title,
    hook: blueprint.hook,
    logline: blueprint.summary.split('\n')[0] ?? '',
  }

  const payload: ScreenwriterPayload = {
    blueprint,
    frameworkAnalysis: analysis,
    storyPackageHint,
  }

  return {
    agentId: 'screenwriter',
    title: 'Blueprint Package',
    summary: `${blueprint.title} — ${fw.label}`,
    preview: beatNotes[0] ?? blueprint.hook,
    payload,
    generatedAt: new Date().toISOString(),
  }
}
