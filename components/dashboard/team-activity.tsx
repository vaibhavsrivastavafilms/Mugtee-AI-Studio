'use client'
import { useStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function TeamActivity() {
  const { activity } = useStore()
  return (
    <motion.div initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{delay:0.1}}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-400/80">Team Activity</div>
          <h3 className="font-display text-2xl mt-1">Live pulse</h3>
        </div>
        <span className="text-[10px] tracking-widest uppercase text-emerald-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
        </span>
      </div>
      <div className="space-y-3 max-h-[340px] overflow-y-auto scrollbar-luxe pr-2">
        {activity.map(a => (
          <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition">
            <Avatar className="w-9 h-9 ring-1 ring-gold-500/30">
              {a.avatar && <AvatarImage src={a.avatar} />}
              <AvatarFallback className="text-xs bg-gold-gradient text-black">{a.who.split(' ').map(x=>x[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm leading-snug">
                <span className="font-medium">{a.who}</span>{' '}
                <span className="text-muted-foreground">{a.action}</span>{' '}
                <span className="text-gold-300">{a.target}</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{a.time}</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
