import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'The AI Documentary Script Workflow — Mugtee',
  description: 'A step-by-step AI workflow for cinematic documentary scripts. Prompt structure, story arc template, and B-roll prompt pipeline.',
  openGraph: { title: 'The AI Documentary Script Workflow', description: 'Idea to cinematic narration in under an hour.', type: 'article' },
}

export default function Post() {
  return (
    <article className="relative min-h-screen bg-background text-luxe overflow-x-hidden">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-white/[0.04]">
        <div className="container max-w-3xl mx-auto px-5 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.25em] uppercase text-luxe/70 hover:text-gold-300 transition"><ArrowLeft className="w-3 h-3" /> All posts</Link>
          <Link href="/login" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gold-gradient text-black text-[12px] font-medium shadow-gold-glow hover:opacity-90 transition">Start Free <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
      </header>

      <div className="container max-w-3xl mx-auto px-5 sm:px-6 pt-12 pb-24">
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-3 inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Scripting · 9 min read</div>
        <h1 className="font-display text-4xl sm:text-5xl leading-[1.1] mb-4">The AI Documentary Script Workflow</h1>
        <p className="text-luxe/70 text-base leading-relaxed mb-10">From a raw curiosity to a cinematic 1,200-word narration in under an hour. This is the exact workflow we built Mugtee around.</p>

        <div className="space-y-7">
          <Step n="01" title="Lock the curiosity, not the topic.">
            Don&apos;t start with &quot;AI documentary about productivity.&quot; Start with &quot;why nobody mentions that the founders of every productivity app are exhausted.&quot; The smaller and more specific the curiosity, the harder it is to scroll past.
          </Step>
          <Step n="02" title="Run the research pass.">
            Ask the AI for 5 surprising facts, 3 contrarian framings, 2 emotional anchors. Discard 70%. Keep what makes your eyebrows raise. This is the only part where speed matters less than discernment.
          </Step>
          <Step n="03" title="Build the arc, not the script.">
            Force a 6-beat structure: Hook → Context → Tension → Escalation → Payoff → Final line. If the arc is weak, no amount of pretty prose saves it. We literally have a Mugtee mode for this called <span className="text-gold-200">deep_research</span>.
          </Step>
          <Step n="04" title="Generate the cinematic script.">
            Long-form mode, Claude 3.5 Sonnet, temperature 0.9, 900-1500 word target. Insist on bracketed scene headers and quoted narration. The output should read like a screenplay-ready narration draft, not a blog post.
          </Step>
          <Step n="05" title="Highlight + rewrite, paragraph by paragraph.">
            This is where most workflows quit. Read aloud. Highlight every sentence that didn&apos;t quite land. Hit &quot;More Emotional&quot; or &quot;Shorter&quot; on each. Don&apos;t regenerate the whole script — surgery, not re-amputation.
          </Step>
          <Step n="06" title="Generate the B-roll prompt pipeline.">
            Each scene gets 1-2 cinematic visual prompts — specific lens, light, composition. These feed straight into your AI image / video tool of choice.
          </Step>
          <Step n="07" title="Record the voiceover. Cut the cinema.">
            From here it&apos;s mechanical. Either narrate it yourself or use a signature TTS. The story is already built — the editor is just protecting it.
          </Step>

          <section className="mt-12 rounded-2xl glass border border-gold-soft p-6">
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-2">Why it works</div>
            <p className="text-luxe/85 text-sm leading-relaxed">Documentary retention is curiosity-driven, not entertainment-driven. Each beat has to compound on the last. The workflow above forces structure first, polish second — which is the opposite of how most creators write.</p>
          </section>

          <CTA />
        </div>
      </div>
    </article>
  )
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-display text-xl text-gold-gradient leading-none tracking-wider">{n}</span>
        <h2 className="font-display text-2xl leading-tight">{title}</h2>
      </div>
      <p className="text-luxe/80 text-[15px] leading-relaxed">{children}</p>
    </section>
  )
}

function CTA() {
  return (
    <div className="mt-12 rounded-3xl p-8 glass-strong border border-gold-500/40 text-center">
      <Sparkles className="w-5 h-5 text-gold-300 mx-auto mb-3" />
      <h3 className="font-display text-2xl mb-2">Ship your first cinematic script in an hour.</h3>
      <p className="text-luxe/65 text-sm mb-5 max-w-md mx-auto">The full Mugtee workflow — research, script, rewrite, B-roll prompts — all in one place.</p>
      <Link href="/login" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gold-gradient text-black text-sm font-medium shadow-gold-glow hover:opacity-90 transition">Launch Mugtee AI <ArrowRight className="w-4 h-4" /></Link>
    </div>
  )
}
