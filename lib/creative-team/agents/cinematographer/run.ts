import type { CameraLanguagePlan, SceneCameraLanguage } from '@/lib/director/types'
import { routeCreativeTeamPrompt } from '@/lib/creative-team/prompt-router'
import type { AgentReport, CinematographyPayload, CreativeTeamContext } from '@/lib/creative-team/types'
import {
  CINEMATOGRAPHER_SYSTEM,
  buildCinematographerUserPrompt,
} from '@/lib/creative-team/agents/cinematographer/prompts'

function heuristicPlan(treatment: NonNullable<CreativeTeamContext['directorTreatment']>): CameraLanguagePlan {
  return {
    globalStyle: treatment.cameraLanguage || `${treatment.visualStyle} — ${treatment.lightingStyle}`,
    scenes: [
      {
        sceneIndex: 1,
        shotType: 'Medium close-up',
        lens: '35mm',
        movement: 'Slow push-in',
        framing: 'Rule of thirds',
        lighting: treatment.lightingStyle || 'Soft key',
        notes: `Hook — ${treatment.mood}`,
      },
      {
        sceneIndex: 2,
        shotType: 'Wide',
        lens: '24mm',
        movement: 'Handheld drift',
        framing: 'Deep staging',
        lighting: treatment.lightingStyle || 'Motivated practicals',
        notes: `Escalation — ${treatment.emotionalArc}`,
      },
      {
        sceneIndex: 3,
        shotType: 'Close-up',
        lens: '50mm',
        movement: 'Static hold',
        framing: 'Center weight',
        lighting: treatment.lightingStyle || 'High contrast',
        notes: `Payoff — ${treatment.colorPalette}`,
      },
    ],
  }
}

function parseScenes(raw: unknown): SceneCameraLanguage[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((s, i) => {
      const row = s as Record<string, unknown>
      return {
        sceneIndex: Number(row.sceneIndex) || i + 1,
        shotType: String(row.shotType ?? 'Medium'),
        lens: String(row.lens ?? '35mm'),
        movement: String(row.movement ?? 'Static'),
        framing: String(row.framing ?? 'Rule of thirds'),
        lighting: String(row.lighting ?? 'Natural'),
        notes: String(row.notes ?? ''),
      }
    })
    .slice(0, 6)
}

/** Wraps camera profile / cinematography panel logic from director treatment. */
export async function runCinematographer(ctx: CreativeTeamContext): Promise<AgentReport<CinematographyPayload>> {
  const treatment = ctx.directorTreatment
  const beatCount = ctx.blueprint?.sceneBeats?.length ?? 3

  if (!treatment) {
    const fallback: CameraLanguagePlan = {
      globalStyle: 'Motivated cinematic coverage',
      scenes: [{ sceneIndex: 1, shotType: 'MCU', lens: '35mm', movement: 'Push', framing: 'Thirds', lighting: 'Soft', notes: 'Await treatment' }],
    }
    return {
      agentId: 'cinematographer',
      title: 'Visual Direction Package',
      summary: 'Scaffold from treatment when available',
      preview: fallback.globalStyle,
      payload: { cameraLanguage: fallback },
      generatedAt: new Date().toISOString(),
    }
  }

  const llm = await routeCreativeTeamPrompt({
    systemPrompt: CINEMATOGRAPHER_SYSTEM,
    userPrompt: buildCinematographerUserPrompt({
      genre: treatment.genre,
      mood: treatment.mood,
      visualStyle: treatment.visualStyle,
      cameraLanguage: treatment.cameraLanguage,
      lightingStyle: treatment.lightingStyle,
      colorPalette: treatment.colorPalette,
      sceneCount: Math.min(beatCount, 4),
    }),
    topic: ctx.idea,
    ctx,
  })

  const heuristic = heuristicPlan(treatment)
  const scenes = parseScenes(llm?.parsed.scenes)
  const cameraLanguage: CameraLanguagePlan = {
    globalStyle: String(llm?.parsed.globalStyle ?? heuristic.globalStyle),
    scenes: scenes.length ? scenes : heuristic.scenes,
  }

  return {
    agentId: 'cinematographer',
    title: 'Visual Direction Package',
    summary: cameraLanguage.globalStyle.slice(0, 80),
    preview: cameraLanguage.scenes[0]?.notes ?? cameraLanguage.scenes[0]?.shotType ?? 'Camera plan ready',
    payload: { cameraLanguage },
    generatedAt: new Date().toISOString(),
  }
}
