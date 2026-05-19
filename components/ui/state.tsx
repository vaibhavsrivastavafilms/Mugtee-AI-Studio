'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-white/[0.03]', className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-gold-500/10 to-transparent" />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: any; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}}
      className="glass rounded-2xl p-10 text-center"
    >
      <div className="mx-auto w-14 h-14 rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold-glow mb-4">
        <Icon className="w-7 h-7 text-black" />
      </div>
      <h3 className="font-display text-xl mb-1">{title}</h3>
      {description && <p className="text-luxe/70 text-sm max-w-sm mx-auto mb-5">{description}</p>}
      {action}
    </motion.div>
  )
}
