import type { DirectorStudioContext } from '@/lib/director/types'

/** Format director studio snapshot for LLM context injection. */
export function formatDirectorStudioForPrompt(ctx: DirectorStudioContext | null | undefined): string {
  if (!ctx) return ''
  const sections: string[] = []

  if (ctx.activeStoryDirection) {
    const d = ctx.activeStoryDirection
    sections.push(
      [
        'DIRECTOR STORY DIRECTION (locked):',
        `Title: ${d.title}`,
        `Logline: ${d.logline}`,
        `Hook: ${d.hook}`,
        `Emotional promise: ${d.emotionalPromise}`,
      ].join('\n')
    )
  }

  if (ctx.directorTreatment) {
    const t = ctx.directorTreatment
    sections.push(
      [
        'DIRECTOR TREATMENT (locked):',
        `Genre: ${t.genre}`,
        `Mood: ${t.mood}`,
        `Arc: ${t.emotionalArc}`,
        `Visual: ${t.visualStyle}`,
        `Camera: ${t.cameraLanguage}`,
        `Lighting: ${t.lightingStyle}`,
        `Palette: ${t.colorPalette}`,
        `Music direction: ${t.musicDirection}`,
        t.referenceFilms.length ? `References: ${t.referenceFilms.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (ctx.storyDirectorPackage) {
    const pkg = ctx.storyDirectorPackage
    const topHook = [...pkg.cinematicHookOptions].sort((a, b) => a.rank - b.rank)[0]?.hook
    sections.push(
      [
        'AI STORY DIRECTOR PACKAGE (locked):',
        `Framework: ${pkg.frameworkLabel}`,
        pkg.storyAnalysis ? `Analysis: ${pkg.storyAnalysis.slice(0, 1200)}` : '',
        topHook ? `Primary hook: ${topHook}` : '',
        pkg.fullCinematicScript
          ? `Script excerpt: ${pkg.fullCinematicScript.slice(0, 1500)}`
          : '',
        pkg.scenes.length
          ? `Scenes (${pkg.scenes.length}): ${pkg.scenes
              .slice(0, 8)
              .map((s) => `${s.index}. ${s.title}`)
              .join(' | ')}`
          : '',
        pkg.viralityAnalysis.retentionBeats.length
          ? `Retention beats: ${pkg.viralityAnalysis.retentionBeats.slice(0, 5).join('; ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (ctx.blueprint?.hook || ctx.blueprint?.script) {
    const b = ctx.blueprint
    sections.push(
      [
        'DIRECTOR BLUEPRINT (approved):',
        b.title ? `Title: ${b.title}` : '',
        b.hook ? `Hook: ${b.hook}` : '',
        b.summary ? `Summary: ${b.summary}` : '',
        b.script ? `Script excerpt: ${b.script.slice(0, 2000)}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (ctx.characterBible?.protagonist) {
    const p = ctx.characterBible.protagonist
    sections.push(
      `CHARACTER BIBLE: ${p.name} — ${p.appearance}. Wardrobe: ${p.wardrobe}. Arc: ${p.arc}`
    )
  }

  if (ctx.cameraLanguage?.scenes?.length) {
    const lines = ctx.cameraLanguage.scenes
      .slice(0, 12)
      .map(
        (s) =>
          `Scene ${s.sceneIndex}: ${s.shotType}, ${s.lens}, ${s.movement} — ${s.notes}`
      )
    sections.push(`CINEMATOGRAPHY PLAN:\n${lines.join('\n')}`)
  }

  if (ctx.storyboardPlan?.scenes?.length) {
    const lines = ctx.storyboardPlan.scenes
      .slice(0, 12)
      .map((s) => `Scene ${s.sceneIndex}: ${s.visualPrompt} | ${s.cameraSetup}`)
    sections.push(`STORYBOARD PLAN:\n${lines.join('\n')}`)
  }

  if (ctx.voiceProfile?.narratorTone) {
    sections.push(
      `VOICE DIRECTION: ${ctx.voiceProfile.narratorTone}, pacing ${ctx.voiceProfile.pacing}`
    )
  }

  if (ctx.musicDirection?.genre) {
    sections.push(
      `MUSIC DIRECTION: ${ctx.musicDirection.genre}, ${ctx.musicDirection.tempo}, ${ctx.musicDirection.emotionalCurve}`
    )
  }

  if (ctx.motionPlan?.scenes?.length) {
    const lines = ctx.motionPlan.scenes
      .slice(0, 12)
      .map((s) => `Scene ${s.sceneIndex}: ${s.motionStyle} (${s.durationSec}s)`)
    sections.push(`MOTION PLAN:\n${lines.join('\n')}`)
  }

  return sections.filter(Boolean).join('\n\n')
}
