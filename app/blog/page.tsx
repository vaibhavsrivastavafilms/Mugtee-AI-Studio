import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { MugteeLogoMark } from '@/components/mugtee/mugtee-logo-mark'

export const metadata: Metadata = {
  title: 'Mugtee Blog — Creator workflows, AI scripts, faceless content',
  description: 'Tactics, templates, and AI workflows for creators shipping cinematic content faster. By Mugtee — AI Production OS.',
}

const POSTS = [
  {
    slug: 'best-faceless-youtube-niches',
    title: 'The 9 Best Faceless YouTube Niches for 2026',
    excerpt: 'Faceless channels that still print attention — and the ones that have peaked. Niche-by-niche breakdown with retention patterns and monetization fit.',
    readTime: '7 min read',
    category: 'YouTube',
  },
  {
    slug: 'ai-documentary-script-workflow',
    title: 'The AI Documentary Script Workflow (Step-by-Step)',
    excerpt: 'How to go from raw idea to cinematic narration in under an hour. The exact prompt structure, story arc template, and B-roll prompt pipeline we use inside Mugtee.',
    readTime: '9 min read',
    category: 'Scripting',
  },
  {
    slug: 'how-to-make-viral-reels-faster',
    title: 'How to Make Viral Reels Faster — Without Burning Out',
    excerpt: 'The 5 sub-second decisions that separate a scroll-stop reel from a flop. Plus the lightweight automation stack that ships them in a fraction of the time.',
    readTime: '6 min read',
    category: 'Reels',
  },
]

export default function BlogIndex() {
  return (
    <div className="relative min-h-screen bg-background text-luxe overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-gold-500/[0.05] blur-[140px]" />
      </div>

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-white/[0.04]">
        <div className="container max-w-4xl mx-auto px-5 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <MugteeLogoMark size={28} className="w-7 h-7 shadow-gold-glow" />
            <span className="font-display text-base tracking-wide"><span className="text-gold-gradient">Mugtee</span> Blog</span>
          </Link>
          <Link href="/login" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gold-gradient text-black text-[12px] font-medium shadow-gold-glow hover:opacity-90 transition">
            Start Free <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <section className="container max-w-4xl mx-auto px-5 sm:px-6 pt-16 pb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-gold-500/30 text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-5">
          <Sparkles className="w-3 h-3" /> Creator Tactics
        </span>
        <h1 className="font-display text-4xl sm:text-5xl leading-tight">The <span className="text-gold-gradient">Mugtee Blog</span></h1>
        <p className="mt-4 text-luxe/70 text-base max-w-2xl">Workflows, AI tactics, and creator economics — written by the people building Mugtee.</p>
      </section>

      <section className="container max-w-4xl mx-auto px-5 sm:px-6 pb-24">
        <div className="space-y-3">
          {POSTS.map(p => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group block glass rounded-2xl border border-gold-soft hover:border-gold-500/40 p-6 transition">
              <div className="flex items-center gap-3 text-[10px] tracking-[0.25em] uppercase text-gold-300/80 mb-2">
                <span>{p.category}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{p.readTime}</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl leading-tight group-hover:text-gold-100 transition">{p.title}</h2>
              <p className="text-luxe/70 mt-2 text-sm leading-relaxed">{p.excerpt}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] tracking-wider uppercase text-gold-300 group-hover:text-gold-200">Read article <ArrowRight className="w-3 h-3" /></div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/[0.04] py-10 px-5 sm:px-6 text-[11px] tracking-wider uppercase text-muted-foreground/80">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Mugtee · An AI Production OS for creators</span>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-gold-300 transition">Home</Link>
            <Link href="/pricing" className="hover:text-gold-300 transition">Pricing</Link>
            <Link href="/about" className="hover:text-gold-300 transition">About</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
