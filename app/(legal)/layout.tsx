import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  robots: { index: true, follow: true },
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Cinematic page bg */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-noir-radial" />
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-gold-500/[0.05] blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full bg-amber-700/[0.04] blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-white/[0.04] safe-area-top">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-luxe/85 hover:text-luxe transition">
            <ChevronLeft className="w-4 h-4 text-gold-300" />
            <span className="font-display">Virlo<span className="text-gold-gradient">AI</span></span>
          </Link>
          <div className="flex items-center gap-1 text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            <Sparkles className="w-3 h-3 text-gold-400" /> Legal
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14 safe-area-bottom">
        {children}
      </main>

      <footer className="max-w-3xl mx-auto px-5 sm:px-8 py-10 text-center text-[11px] tracking-[0.2em] uppercase text-muted-foreground/70">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-3">
          <Link href="/privacy" className="hover:text-gold-300 transition">Privacy</Link>
          <Link href="/terms"   className="hover:text-gold-300 transition">Terms</Link>
          <Link href="/about"   className="hover:text-gold-300 transition">About</Link>
          <Link href="/pricing" className="hover:text-gold-300 transition">Pricing</Link>
        </div>
        © {new Date().getFullYear()} ViralForgeAI · An AI Production OS for creators
      </footer>
    </div>
  )
}
