'use client'
import { useStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, format, isSameMonth, isSameDay, parseISO } from 'date-fns'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, subMonths } from 'date-fns'
import { cn } from '@/lib/utils'
import { PLATFORM_META } from '@/lib/dummy-data'

export function PostingCalendar() {
  const { content } = useStore()
  const [cursor, setCursor] = useState(new Date())

  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end })

  const scheduled = content.filter(c => c.scheduled_at)

  return (
    <motion.div initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{delay:0.2}}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-400/80">Posting Calendar</div>
          <h3 className="font-display text-2xl mt-1">{format(cursor, 'MMMM yyyy')}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(subMonths(cursor, 1))} className="p-2 rounded-lg hover:bg-white/5"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setCursor(new Date())} className="px-3 py-1.5 text-xs rounded-lg hover:bg-white/5 text-luxe">Today</button>
          <button onClick={() => setCursor(addMonths(cursor, 1))} className="p-2 rounded-lg hover:bg-white/5"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground text-center pb-2">{d}</div>
        ))}
        {days.map(day => {
          const items = scheduled.filter(c => isSameDay(parseISO(c.scheduled_at!), day))
          const inMonth = isSameMonth(day, cursor)
          const today = isSameDay(day, new Date())
          return (
            <div key={day.toISOString()}
              className={cn(
                'min-h-[68px] sm:min-h-[88px] rounded-lg p-1.5 sm:p-2 text-xs relative overflow-hidden transition',
                inMonth ? 'bg-white/[0.02] border border-white/[0.04]' : 'bg-transparent border border-transparent opacity-40',
                today && 'ring-1 ring-gold-500/60 bg-gold-500/[0.06]'
              )}
            >
              <div className={cn('text-[10px] sm:text-xs mb-1', today ? 'text-gold-300 font-semibold' : 'text-muted-foreground')}>{format(day, 'd')}</div>
              <div className="space-y-1">
                {items.slice(0,2).map(i => (
                  <div key={i.id} className="px-1.5 py-0.5 rounded-md bg-gold-500/15 border border-gold-500/30 text-[10px] truncate">
                    <span className={cn('font-medium', PLATFORM_META[i.platform].color)}>•</span> {i.title}
                  </div>
                ))}
                {items.length > 2 && <div className="text-[10px] text-muted-foreground">+{items.length - 2} more</div>}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
