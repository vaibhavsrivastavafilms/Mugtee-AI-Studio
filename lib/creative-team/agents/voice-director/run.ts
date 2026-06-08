import type { VoiceProfile } from '@/lib/director/types'
import { routeCreativeTeamPrompt } from '@/lib/creative-team/prompt-router'
import type { AgentReport, CreativeTeamContext, VoicePayload } from '@/lib/creative-team/types'
import {
  VOICE_DIRECTOR_SYSTEM,
  buildVoiceDirectorUserPrompt,
} from '@/lib/creative-team/agents/voice-director/prompts'

function heuristicVoice(treatment: NonNullable<CreativeTeamContext['directorTreatment']>): VoiceProfile {
  return {
    narratorTone: `${treatment.mood} authority — intimate but confident`,
    pacing: 'Measured with punch on hooks',
    emphasis: `Stress ${treatment.emotionalArc.split(' ')[0] ?? 'contrast'} beats`,
    dialect: 'Neutral broadcast',
    sceneNotes: { '1': `Open with ${treatment.genre} tone` },
  }
}

/** Wraps voice_profiles schema / VoiceDirectorPanel defaults. */
export async function runVoiceDirector(ctx: CreativeTeamContext): Promise<AgentReport<VoicePayload>> {
  const treatment = ctx.directorTreatment

  if (!treatment) {
    const voiceProfile: VoiceProfile = {
      narratorTone: 'Warm authority',
      pacing: 'Measured',
      emphasis: 'Hook contrast',
      dialect: 'Neutral',
      sceneNotes: {},
    }
    return {
      agentId: 'voice-director',
      title: 'Voice Package',
      summary: voiceProfile.narratorTone,
      preview: voiceProfile.pacing,
      payload: { voiceProfile },
      generatedAt: new Date().toISOString(),
    }
  }

  const llm = await routeCreativeTeamPrompt({
    systemPrompt: VOICE_DIRECTOR_SYSTEM,
    userPrompt: buildVoiceDirectorUserPrompt({
      genre: treatment.genre,
      mood: treatment.mood,
      emotionalArc: treatment.emotionalArc,
      musicDirection: treatment.musicDirection,
    }),
    topic: ctx.idea,
    ctx,
  })

  const base = heuristicVoice(treatment)
  const voiceProfile: VoiceProfile = {
    narratorTone: String(llm?.parsed.narratorTone ?? base.narratorTone),
    pacing: String(llm?.parsed.pacing ?? base.pacing),
    emphasis: String(llm?.parsed.emphasis ?? base.emphasis),
    dialect: String(llm?.parsed.dialect ?? base.dialect),
    sceneNotes: (llm?.parsed.sceneNotes as Record<string, string>) ?? base.sceneNotes,
  }

  return {
    agentId: 'voice-director',
    title: 'Voice Package',
    summary: voiceProfile.narratorTone,
    preview: `${voiceProfile.pacing} · ${voiceProfile.emphasis.slice(0, 60)}`,
    payload: { voiceProfile },
    generatedAt: new Date().toISOString(),
  }
}
