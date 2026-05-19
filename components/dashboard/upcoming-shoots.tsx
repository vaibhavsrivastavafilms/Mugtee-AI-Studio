'use client'
import { useStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { Clapperboard, MapPin, Clock } from 'lucide-react'
import { Skeleton, EmptyState } from '@/components/ui/state'

export function UpcomingShoots() {
  const { shoots, loading } = useStore()
  const upcoming = shoots
    .filter(s => s.date)
    .sort((a,b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, 4)

  return (
    <motion.div initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{delay:0.25}}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-400/80">On Set Next</div>
          <h3 className="font-display text-2xl mt-1">Upcoming shoots</h3>
        </div>
      </div>
      {loading.shoots ? (
        <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : upcoming.length === 0 ? (
        <div className="text-center py-8 text-luxe/60 text-sm">No shoots scheduled.</div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((s, i) => {
            const d = s.date ? parseISO(s.date) : null
            return (
              <motion.div key={s.id}
                initial={{opacity:0, x:8}} animate={{opacity:1, x:0}} transition={{delay:0.3 + i*0.08}}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-gold-500/30 transition group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-lg bg-gold-gradient flex flex-col items-center justify-center text-black shrink-0">
                    <span className="text-[9px] uppercase tracking-wider opacity-80 leading-none">{d ? format(d, 'MMM') : ''}</span>
                    <span className="font-display text-lg leading-none">{d ? format(d, 'd') : '—'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.title}</div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      {s.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.start_time}</span>}
                      {s.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" /> {s.location}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
