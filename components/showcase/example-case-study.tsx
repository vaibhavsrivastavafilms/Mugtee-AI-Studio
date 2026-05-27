import Link from 'next/link'
import { ArrowLeft, Film } from 'lucide-react'
import { notFound } from 'next/navigation'
import {
  getShowcaseBySlug,
  nicheLabel,
  voiceStyleLabel,
  type ShowcaseScene,
} from '@/lib/showcase/examples'
import { SceneVisualChips } from '@/components/cinematic/scene-visual-chips'
import type { CinematicScene } from '@/stores/cinematic-project'

function sceneToCard(scene: ShowcaseScene, index: number): CinematicScene {
  return {
    id: `example-scene-${index + 1}`,
    index: index + 1,
    title: scene.title,
    narration: scene.description,
    duration: scene.duration,
    visualPrompt: scene.visualPrompt,
    cameraAngle: scene.cameraAngle,
    lightingMood: scene.lightingMood,
    environment: scene.environment,
    colorPalette: scene.colorPalette,
    movementStyle: scene.movementStyle,
    camera: scene.cameraAngle,
    lighting: scene.lightingMood,
  }
}

export function ShowcaseExampleView({ slug }: { slug: string }) {
  const example = getShowcaseBySlug(slug)
  if (!example) notFound()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-white/[0.06] bg-black/20">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[#C8A24E]/80 hover:text-[#E7C56A] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
          <span className="text-[10px] tracking-[0.25em] uppercase text-white/40">
            Cinematic case study
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14 space-y-10">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-[10px] tracking-[0.22em] uppercase text-[#E7C56A]">
              {nicheLabel(example.niche)}
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-white/40">
              {example.coverMood}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-[#F4E7C1] leading-tight">
            {example.title}
          </h1>
          <p className="text-lg sm:text-xl text-[#F4E7C1]/90 italic leading-relaxed border-l-2 border-[#D4AF37]/40 pl-4">
            {example.hook}
          </p>
          <p className="text-white/65 leading-8">{example.summary}</p>
        </header>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 space-y-3">
          <p className="text-[#C8A24E] uppercase tracking-[0.3em] text-xs">
            Visual Direction
          </p>
          <p className="text-white/75 leading-7 italic">{example.visualDirection}</p>
          <p className="text-sm text-white/50">
            Voice · {voiceStyleLabel(example.voiceStyle)}
          </p>
        </section>

        <section className="space-y-4">
          <p className="text-[#C8A24E] uppercase tracking-[0.3em] text-xs">
            Scene Flow
          </p>
          {example.scenes.map((scene, i) => {
            const card = sceneToCard(scene, i)
            return (
              <article
                key={i}
                className="rounded-[24px] border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                <div className="h-24 bg-gradient-to-br from-[#2B1A08] via-[#120D08] to-black flex items-center justify-center">
                  <Film className="w-7 h-7 text-[#D4AF37]/45" />
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] tracking-[0.25em] uppercase text-[#C8A24E]">
                      Scene {i + 1}
                      {scene.duration ? ` · ${scene.duration}s` : ''}
                    </span>
                  </div>
                  <SceneVisualChips scene={card} />
                  {scene.title ? (
                    <p className="text-[#F4E7C1] text-lg leading-snug">{scene.title}</p>
                  ) : null}
                  <p className="text-white/65 text-sm leading-7">{scene.description}</p>
                  <p className="text-white/50 text-sm leading-7 italic border-t border-white/5 pt-3">
                    {scene.visualPrompt}
                  </p>
                </div>
              </article>
            )
          })}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 space-y-3">
          <p className="text-[#C8A24E] uppercase tracking-[0.3em] text-xs">
            Captions
          </p>
          <div className="space-y-2 text-white/75 leading-7">
            {example.captions.map((line, i) => (
              <p key={i} className={line.startsWith('#') ? 'text-[#C8A24E]/80 text-sm' : ''}>
                {line}
              </p>
            ))}
          </div>
        </section>

        <div className="pt-4 pb-8">
          <Link
            href="/login?next=%2Fcinematic%2Fcreate"
            className="inline-flex items-center justify-center w-full sm:w-auto px-8 h-14 rounded-2xl bg-[#D4AF37] text-black font-semibold hover:bg-[#E7C56A] transition"
          >
            Create your cinematic story
          </Link>
        </div>
      </div>
    </div>
  )
}
