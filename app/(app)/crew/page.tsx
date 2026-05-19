'use client'
import { useStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mail, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CrewPage() {
  const { crew } = useStore()
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
        <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Crew</div>
        <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">The</span> ensemble</h1>
        <p className="text-luxe/70 mt-2">Your in-house production team.</p>
      </motion.div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {crew.map((c, i) => (
          <motion.div key={c.id}
            initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{delay:i*0.05}}
            whileHover={{y:-3}}
            className="glass rounded-2xl p-5 hover:shadow-cinema"
          >
            <div className="flex items-start gap-4">
              <Avatar className="w-14 h-14 ring-2 ring-gold-500/40">
                <AvatarImage src={c.avatar_url} />
                <AvatarFallback className="bg-gold-gradient text-black font-semibold">{c.name.split(' ').map(x=>x[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg leading-tight">{c.name}</div>
                <div className="text-xs text-gold-400/90 mt-0.5 tracking-wide">{c.role}</div>
                <div className={cn('mt-2 inline-flex items-center gap-1.5 text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full',
                  c.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' :
                  c.status === 'busy' ? 'bg-orange-500/15 text-orange-300' : 'bg-zinc-500/15 text-zinc-400'
                )}>
                  <span className="w-1 h-1 rounded-full bg-current" />{c.status}
                </div>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-white/5"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
            <div className="gold-divider my-4" />
            <div className="flex items-center justify-between text-xs">
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-gold-300"><Mail className="w-3.5 h-3.5" /> Message</button>
              <button className="text-gold-400 hover:text-gold-300">View profile →</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
