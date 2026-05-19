'use client'
import { motion } from 'framer-motion'
import { Area, AreaChart, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { TrendingUp, Eye, Heart, Users } from 'lucide-react'

const VIEWS = Array.from({ length: 14 }, (_, i) => ({ d: `D${i+1}`, v: 12000 + Math.round(Math.random()*30000) }))
const ENGAGEMENT = [
  { name: 'YouTube',   v: 84 },
  { name: 'Instagram', v: 92 },
  { name: 'TikTok',    v: 78 },
  { name: 'Twitter',   v: 41 },
  { name: 'LinkedIn',  v: 56 },
]

export default function AnalyticsPage() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
        <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Analytics</div>
        <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">Studio</span> performance</h1>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Views',     value: '2.4M', delta: '+18%', icon: Eye },
          { label: 'Engagements',     value: '184K', delta: '+11%', icon: Heart },
          { label: 'New Followers',   value: '12.8K', delta: '+22%', icon: Users },
          { label: 'Avg Watch Time',  value: '4m 18s', delta: '+0:32', icon: TrendingUp },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label}
              initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg glass-gold flex items-center justify-center"><Icon className="w-4 h-4 text-gold-300" /></div>
                <span className="text-[10px] text-emerald-300">{s.delta}</span>
              </div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground">{s.label}</div>
              <div className="font-display text-3xl mt-1">{s.value}</div>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{opacity:0, y:14}} animate={{opacity:1,y:0}} className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-400/80">Daily Views</div>
          <h3 className="font-display text-2xl mt-1 mb-4">14-day trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={VIEWS}>
                <defs>
                  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F5D061" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#F5D061" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="d" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip contentStyle={{ background: 'rgba(20,16,12,0.95)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12 }} />
                <Area type="monotone" dataKey="v" stroke="#F5D061" strokeWidth={2} fill="url(#gold)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{opacity:0, y:14}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="glass rounded-2xl p-6">
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-400/80">Engagement</div>
          <h3 className="font-display text-2xl mt-1 mb-4">By platform</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ENGAGEMENT} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} />
                <Tooltip contentStyle={{ background: 'rgba(20,16,12,0.95)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12 }} cursor={{ fill: 'rgba(245,208,97,0.05)' }} />
                <Bar dataKey="v" fill="#D4AF37" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
