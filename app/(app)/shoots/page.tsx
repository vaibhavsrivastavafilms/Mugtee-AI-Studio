'use client'
import { motion } from 'framer-motion'
import { Clapperboard, MapPin, Clock, Users, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface Shoot { id: string; title: string; date: string; time: string; loc: string; crew: string[]; status: 'planned' | 'today' | 'wrapped' }
const INITIAL_SHOOTS: Shoot[] = [
  { id: 's1', title: 'Midnight Pasta · Rome',     date: 'Jun 22, 2025',  time: '21:00 – 02:00', loc: 'Trastevere, Rome',  crew: ['Aria','Leo','Saanvi'], status: 'planned' },
  { id: 's2', title: 'Espresso Bar Vlog',           date: 'Jun 20, 2025',  time: '08:30 – 12:30', loc: 'Brera, Milan',      crew: ['Leo','Theo'],          status: 'today' },
  { id: 's3', title: 'Knife Skills Reshoot',        date: 'Jun 25, 2025',  time: '14:00 – 18:00', loc: 'Studio A, Soho',    crew: ['Saanvi','Theo'],       status: 'planned' },
  { id: 's4', title: 'Tokyo Ramen Tour B-Roll',     date: 'Jun 12, 2025',  time: '—',           loc: 'Shibuya, Tokyo',    crew: ['Aria','Leo'],          status: 'wrapped' },
]

export default function ShootsPage() {
  const [shoots] = useState(INITIAL_SHOOTS)
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Shoot Scheduling</div>
          <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">On</span> location</h1>
          <p className="text-luxe/70 mt-2">Production days, locations, and call sheets.</p>
        </div>
        <Button className="bg-gold-gradient text-black gap-2 shadow-gold-glow"><Plus className="w-4 h-4" /> Schedule shoot</Button>
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {shoots.map((s, i) => (
          <motion.div key={s.id}
            initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{delay:i*0.06}}
            whileHover={{y:-3}}
            className="glass rounded-2xl p-5 hover:shadow-cinema"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gold-gradient flex items-center justify-center shrink-0 shadow-gold-glow">
                <Clapperboard className="w-6 h-6 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl truncate">{s.title}</h3>
                  <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full ${s.status==='today' ? 'bg-gold-500/20 text-gold-300' : s.status==='wrapped' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-500/15 text-zinc-400'}`}>{s.status}</span>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                  <div className="flex items-center gap-2 text-luxe/80"><Clock className="w-3.5 h-3.5 text-gold-400" />{s.date}</div>
                  <div className="flex items-center gap-2 text-luxe/80"><Clock className="w-3.5 h-3.5 text-gold-400" />{s.time}</div>
                  <div className="flex items-center gap-2 text-luxe/80 col-span-full"><MapPin className="w-3.5 h-3.5 text-gold-400" />{s.loc}</div>
                  <div className="flex items-center gap-2 text-luxe/80 col-span-full"><Users className="w-3.5 h-3.5 text-gold-400" />{s.crew.join(' · ')}</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
