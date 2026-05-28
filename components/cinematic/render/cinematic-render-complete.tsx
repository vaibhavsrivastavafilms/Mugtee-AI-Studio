'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Download, Clapperboard, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CinematicRenderComplete({
  videoUrl,
  directorHref,
  onPublish,
  className,
}: {
  videoUrl: string | null
  directorHref: string
  onPublish?: () => void
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-wrap justify-center gap-3', className)}
    >
      {videoUrl ? (
        <motion.a
          href={videoUrl}
          download
          animate={{ boxShadow: ['0 0 0 rgba(212,175,55,0)', '0 0 24px rgba(212,175,55,0.35)', '0 0 0 rgba(212,175,55,0)'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-gradient text-black text-sm font-medium hover:brightness-110 transition"
        >
          <Download className="w-4 h-4" />
          Download MP4
        </motion.a>
      ) : (
        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold-500/30 text-gold-200/60 text-sm">
          <Download className="w-4 h-4" />
          Preview ready — MP4 when render completes
        </span>
      )}

      <Link
        href={directorHref}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl glass border border-gold-soft text-[#F4E7C1] text-sm hover:border-[#D4AF37]/40 transition"
      >
        <Clapperboard className="w-4 h-4" />
        Open Director Mode
      </Link>

      <button
        type="button"
        onClick={onPublish}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-white/70 text-sm hover:border-[#D4AF37]/25 hover:text-[#F4E7C1] transition"
      >
        <Share2 className="w-4 h-4" />
        Publish Reel
      </button>
    </motion.div>
  )
}
