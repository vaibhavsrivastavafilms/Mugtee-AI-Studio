import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'How to Make Viral Reels Faster — Mugtee',
  description: 'The 5 sub-second decisions that separate viral reels from flops, plus a lightweight automation stack to ship them faster.',
  openGraph: { title: 'How to Make Viral Reels Faster — Without Burning Out', description: 'The 5 decisions that separate scroll-stop reels from flops.', type: 'article' },
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
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-3 inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Reels · 6 min read</div>
        <h1 className="font-display text-4xl sm:text-5xl leading-[1.1] mb-4">How to Make Viral Reels Faster — Without Burning Out</h1>
        <p className="text-luxe/70 text-base leading-relaxed mb-10">A reel doesn't have 8 seconds. It has 0.6 seconds. Inside that window, you make 5 decisions. Get them right and the algorithm protects you — get them wrong and it doesn't matter how long your script is.</p>

        <div className="space-y-7">
          <Item title="1. First frame must promise.">
            Not tease — promise. The viewer should see something they cannot un-see. A face mid-emotion, an object out of context, a number that's wrong on purpose. If frame one is generic, the rest of the reel never gets a chance.
          </Item>
          <Item title="2. First line must mismatch the visual.">
            Mild dissonance between what they see and what they hear creates the curiosity loop. A serene shot + an aggressive line. A loud scene + a whispered line. Mismatch is the cheapest hook in existence.
          </Item>
          <Item title="3. Every 3 seconds, change something.">
            Cut. Push in. Re-frame. Change voice tone. The eye is a predator — it gets bored before the brain does. Visual energy ≠ chaos; it's just non-static.
          </Item>
          <Item title="4. Don't pay off on time.">
            Make the viewer wait. Not too long — but long enough to commit. Premature payoff is the #1 reason an otherwise great reel underperforms. The dopamine curve has to climb.
          </Item>
          <Item title="5. The last line is the share button.">
            Reels go viral because someone tags someone else. Your final line decides whether that share happens. "Tag a friend who needs to see this" is dead — replace it with a line that earns the share emotionally.
          </Item>

          <section className="mt-10 rounded-2xl glass border border-gold-soft p-6">
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-2">The automation stack</div>
            <p className="text-luxe/85 text-sm leading-relaxed mb-3">You shouldn't be making these decisions in a vacuum. The right stack collapses a 6-hour edit into a 90-minute edit:</p>
            <ul className="text-luxe/85 text-sm leading-relaxed list-disc pl-5 space-y-1.5">
              <li>AI script + hook engine (Mugtee)</li>
              <li>Cinematic B-roll prompt pipeline (Mugtee → image AI)</li>
              <li>Voiceover — yours, or a signature TTS</li>
              <li>One-tap multi-platform publish (Instagram + YouTube)</li>
            </ul>
          </section>

          <CTA />
        </div>
      </div>
    </article>
  )
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl leading-tight mb-2">{title}</h2>
      <p className="text-luxe/80 text-[15px] leading-relaxed">{children}</p>
    </section>
  )
}

function CTA() {
  return (
    <div className="mt-12 rounded-3xl p-8 glass-strong border border-gold-500/40 text-center">
      <Sparkles className="w-5 h-5 text-gold-300 mx-auto mb-3" />
      <h3 className="font-display text-2xl mb-2">Reels, in a fraction of the time.</h3>
      <p className="text-luxe/65 text-sm mb-5 max-w-md mx-auto">Mugtee scripts, B-roll prompts, captions, and publishes — all in one cinematic workspace.</p>
      <Link href="/login" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gold-gradient text-black text-sm font-medium shadow-gold-glow hover:opacity-90 transition">Launch Mugtee AI <ArrowRight className="w-4 h-4" /></Link>
    </div>
  )
}
