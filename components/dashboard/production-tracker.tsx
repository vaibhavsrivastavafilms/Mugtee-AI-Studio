'use client'
import { useStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { STATUS_META } from '@/lib/dummy-data'
import { Film } from 'lucide-react'
import Link from 'next/link'

const STAGES = ['idea', 'scripting', 'shooting', 'editing', 'scheduled', 'published'] as const

export function ProductionTracker() {
  const { content } = useStore()
  const counts = STAGES.map(s => ({ stage: s, n: content.filter(c => c.status === s).length }))
  const max = Math.max(...counts.map(c => c.n), 1)
  const total = content.length

  return (
    <motion.div initial={{opacity:0, y:14}} animate={{opacity:1, y:0}}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-400/80">Production Tracker</div>
          <h3 className="font-display text-2xl mt-1">Pipeline flow</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Film className="w-3.5 h-3.5 text-gold-400" /> {total} pieces in motion
        </div>
      </div>

      <div className="space-y-3.5">
        {counts.map(({ stage, n }, i) => {
          const pct = (n / max) * 100
          const meta = STATUS_META[stage]
          return (
            <Link key={stage} href={`/pipeline?status=${stage}`}
              className="block group cursor-pointer -mx-2 px-2 py-1 rounded-md hover:bg-white/[0.025] transition"
            >
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="tracking-wide group-hover:text-gold-300 transition">{meta.label}</span>
                <span className="text-muted-foreground tabular-nums">{n}</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div
                  initial={{width:0}} animate={{width: `${pct}%`}} transition={{delay:i*0.08, duration:0.8, ease:'easeOut'}}
                  className="h-full bg-gradient-to-r from-gold-500 via-gold-400 to-gold-300 shadow-gold-glow"
                />
              </div>
            </Link>
          )
        })}
      </div>
    </motion.div>
  )
}
