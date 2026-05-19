'use client'
import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { StatCards } from '@/components/dashboard/stat-cards'
import { ProductionTracker } from '@/components/dashboard/production-tracker'
import { TeamActivity } from '@/components/dashboard/team-activity'
import { PostingCalendar } from '@/components/dashboard/posting-calendar'
import { UpcomingShoots } from '@/components/dashboard/upcoming-shoots'
import { ViralQuickStart } from '@/components/dashboard/viral-quick-start'
import { format } from 'date-fns'

export default function DashboardPage() {
  const { content } = useStore()
  const today = new Date()
  return (
    <div className="space-y-6 sm:space-y-8 max-w-[1600px] mx-auto">
      {/* Greeting */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.6}}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">{format(today, 'EEEE · MMM d, yyyy')}</div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl">
            <span className="text-foreground">Welcome back to the </span>
            <span className="text-gold-gradient">Studio</span>
          </h1>
          <p className="text-luxe/70 mt-2 max-w-xl">{content.length} pieces in motion. Here’s the cinematic state of your production.</p>
        </div>
      </motion.div>

      {/* TT Viral Quick Start hero */}
      <ViralQuickStart />

      {/* Stat cards */}
      <StatCards />

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <ProductionTracker />
          <PostingCalendar />
        </div>
        <div className="space-y-5">
          <TeamActivity />
          <UpcomingShoots />
        </div>
      </div>
    </div>
  )
}
