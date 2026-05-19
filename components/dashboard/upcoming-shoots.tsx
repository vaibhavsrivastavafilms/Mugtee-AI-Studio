'use client'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Clock } from 'lucide-react'

const SHOOTS = [
  { id: 's1', title: 'Midnight Pasta · Rome',     date: 'Jun 22',  time: '21:00',  loc: 'Trastevere, Rome' },
  { id: 's2', title: 'Espresso Bar Vlog',           date: 'Jun 20',  time: '08:30',  loc: 'Brera, Milan' },
  { id: 's3', title: 'Knife Skills Reshoot',        date: 'Jun 25',  time: '14:00',  loc: 'Studio A' },
]

export function UpcomingShoots() {
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
      <div className="space-y-3">
        {SHOOTS.map((s, i) => (
          <motion.div key={s.id}
            initial={{opacity:0, x:8}} animate={{opacity:1, x:0}} transition={{delay:0.3 + i*0.08}}
            className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-gold-500/30 transition group"
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-lg bg-gold-gradient flex flex-col items-center justify-center text-black shrink-0">
                <span className="text-[9px] uppercase tracking-wider opacity-80 leading-none">{s.date.split(' ')[0]}</span>
                <span className="font-display text-lg leading-none">{s.date.split(' ')[1]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{s.title}</div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.time}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.loc}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
