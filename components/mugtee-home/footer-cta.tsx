'use client'

import { memo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const FooterCTA = memo(function FooterCTA({
  dashboardHref = '/create?mode=quick',
  loginHref = '/create?mode=quick',
  signedIn = null,
}: {
  dashboardHref?: string
  loginHref?: string
  signedIn?: boolean | null
}) {
  const ctaHref = signedIn ? dashboardHref : loginHref

  return (
    <section className="relative px-5 sm:px-6 py-20 sm:py-28 border-t border-white/[0.04]">
      <div className="container max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-luxe leading-tight">
            Direct Your First{' '}
            <span className="text-gold-gradient">Cinematic Story</span>
          </h2>
          <p className="text-sm sm:text-base text-luxe/60 max-w-md mx-auto">
            One idea. Six beats. One exported vertical video — ready for YouTube Shorts
            and Reels.
          </p>
          <Button
            asChild
            className="min-h-[48px] px-8 rounded-xl text-[13px] tracking-[0.14em] uppercase bg-gold-gradient text-black font-semibold shadow-gold-glow hover:opacity-90 gap-2 transition-opacity duration-300"
          >
            <Link href={ctaHref}>
              Start Creating
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>

        <footer className="mt-16 pt-8 border-t border-white/[0.04] text-[11px] text-luxe/40 tracking-wide">
          <p>© {new Date().getFullYear()} Mugtee · Cinematic AI Studio</p>
        </footer>
      </div>
    </section>
  )
})
