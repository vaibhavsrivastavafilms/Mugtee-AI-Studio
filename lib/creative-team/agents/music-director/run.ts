import type { MusicDirection } from '@/lib/director/types'
import { routeCreativeTeamPrompt } from '@/lib/creative-team/prompt-router'
import type { AgentReport, CreativeTeamContext, MusicPayload } from '@/lib/creative-team/types'
import {
  MUSIC_DIRECTOR_SYSTEM,
  buildMusicDirectorUserPrompt,
} from '@/lib/creative-team/agents/music-director/prompts'

function heuristicMusic(treatment: NonNullable<CreativeTeamContext['directorTreatment']>): MusicDirection {
  return {
    genre: treatment.musicDirection || 'Cinematic ambient',
    tempo: treatment.mood.includes('urgent') ? 'Driving 120 BPM' : 'Moderate 90 BPM',
    instrumentation: 'Strings + subtle pulse',
    emotionalCurve: treatment.emotionalArc || 'Build → release',
    referenceTracks: treatment.referenceFilms.slice(0, 2),
  }
}

/** Wraps music_profiles schema / MusicDirectorPanel defaults. */
export async function runMusicDirector(ctx: CreativeTeamContext): Promise<AgentReport<MusicPayload>> {
  const treatment = ctx.directorTreatment

  if (!treatment) {
    const musicDirection: MusicDirection = {
      genre: 'Cinematic ambient',
      tempo: '90 BPM',
      instrumentation: 'Pads + piano',
      emotionalCurve: 'Steady build',
      referenceTracks: [],
    }
    return {
      agentId: 'music-director',
      title: 'Music Package',
      summary: musicDirection.genre,
      preview: musicDirection.emotionalCurve,
      payload: { musicDirection },
      generatedAt: new Date().toISOString(),
    }
  }

  const llm = await routeCreativeTeamPrompt({
    systemPrompt: MUSIC_DIRECTOR_SYSTEM,
    userPrompt: buildMusicDirectorUserPrompt({
      genre: treatment.genre,
      mood: treatment.mood,
      musicDirection: treatment.musicDirection,
      referenceFilms: treatment.referenceFilms,
    }),
    topic: ctx.idea,
    ctx,
  })

  const base = heuristicMusic(treatment)
  const refs = llm?.parsed.referenceTracks
  const musicDirection: MusicDirection = {
    genre: String(llm?.parsed.genre ?? base.genre),
    tempo: String(llm?.parsed.tempo ?? base.tempo),
    instrumentation: String(llm?.parsed.instrumentation ?? base.instrumentation),
    emotionalCurve: String(llm?.parsed.emotionalCurve ?? base.emotionalCurve),
    referenceTracks: Array.isArray(refs)
      ? refs.map(String).slice(0, 4)
      : base.referenceTracks,
  }

  return {
    agentId: 'music-director',
    title: 'Music Package',
    summary: `${musicDirection.genre} · ${musicDirection.tempo}`,
    preview: musicDirection.emotionalCurve,
    payload: { musicDirection },
    generatedAt: new Date().toISOString(),
  }
}
