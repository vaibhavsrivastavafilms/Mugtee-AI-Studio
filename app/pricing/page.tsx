'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Sparkles, Check, ArrowRight, Crown, Users, Building2, Lightbulb, FileText, Camera, Scissors, CalendarCheck, Send, BarChart3, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const WORKFLOW = [
  { icon: Lightbulb,      label: 'Plan' },
  { icon: FileText,       label: 'Script' },
  { icon: Camera,         label: 'Shoot' },
  { icon: Scissors,       label: 'Edit' },
  { icon: CalendarCheck,  label: 'Schedule' },
  { icon: Send,           label: 'Publish' },
  { icon: BarChart3,      label: 'Track' },
]

const PLANS = [
  {
    key: 'creator',
    name: 'Single Creator',
    badge: 'For solo storytellers',
    icon: Crown,
    price: 245,
    cycle: '/month',
    cta: 'Start Creating',
    href: '/login',
    featured: false,
    features: [
      '1 creator workspace',
      'AI scripting',
      'Viral idea engine',
      'Instagram + YouTube scheduling',
      'Realtime production pipeline',
      'Media management',
      '2 devices max',
    ],
  },
  {
    key: 'agency',
    name: 'Agency Studio',
    badge: 'For small teams',
    icon: Users,
    price: 999,
    cycle: '/month',
    cta: 'Launch Studio',
    href: '/login',
    featured: true,
    features: [
      'Up to 5 members',
      'Collaborative workspace',
      'Shared pipeline',
      'Realtime sync',
      'Advanced scheduling',
      'Higher AI usage',
      '5 devices max',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    badge: 'For larger production houses',
    icon: Building2,
    price: null,
    cycle: 'Custom',
    cta: 'Contact Support',
    href: 'mailto:support@tabletales.studio?subject=Enterprise%20Plan%20Enquiry',
    featured: false,
    features: [
      'Unlimited members',
      'Unlimited devices',
      'Priority support',
      'Dedicated onboarding',
      'Custom integrations',
      'SLA + uptime guarantee',
    ],
    blurb: 'Need more than 5 members or devices?',
  },
]

export default function PricingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Cinematic ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-8%] left-[8%] w-[40vw] h-[40vw] rounded-full blur-2xl opacity-20" style={{background:'radial-gradient(circle, hsl(43 60% 50% / 0.35), transparent 65%)'}} />
        <div className="absolute bottom-[-15%] right-[-8%] w-[38vw] h-[38vw] rounded-full blur-2xl opacity-15" style={{background:'radial-gradient(circle, hsl(43 60% 45% / 0.3), transparent 70%)'}} />
      </div>

      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-gold-400/80 hover:text-gold-300 transition">
            <ChevronLeft className="w-3.5 h-3.5" /> ViralForge Studio
          </Link>
          <Link href="/login" className="inline-flex items-center gap-1 text-xs tracking-wider text-luxe/70 hover:text-gold-300 transition">
            Sign in <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Hero */}
        <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.6}}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-5">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-luxe">Pricing</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] tracking-tight">
            <span className="text-foreground">The </span>
            <span className="text-gold-gradient">AI Production OS</span>
            <br />
            <span className="text-foreground">for creators.</span>
          </h1>
          <p className="text-luxe/80 mt-5 text-base sm:text-lg leading-relaxed">
            Plan, script, shoot, edit, schedule, publish, and track — all from one cinematic workspace.
            Built for storytellers who refuse to settle for ordinary.
          </p>

          {/* Workflow strip */}
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.25, duration:0.5}}
            className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 mt-7"
          >
            {WORKFLOW.map((w, i) => (
              <div key={w.label} className="contents">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md glass text-[11px] tracking-wide text-luxe">
                  <w.icon className="w-3 h-3 text-gold-400" /> {w.label}
                </div>
                {i < WORKFLOW.length - 1 && <span className="text-gold-400/40 text-xs">→</span>}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14 sm:mt-16 items-stretch">
          {PLANS.map((p, idx) => {
            const Icon = p.icon
            return (
              <motion.div
                key={p.key}
                initial={{opacity:0, y:18}} animate={{opacity:1, y:0}} transition={{delay: 0.1 + idx*0.08, duration:0.55}}
                whileHover={{y:-4}}
                className={cn(
                  'relative rounded-2xl p-6 sm:p-7 flex flex-col transition-shadow',
                  p.featured
                    ? 'glass-strong border border-gold-500/40 shadow-gold-glow-lg'
                    : 'glass border border-white/[0.06] hover:shadow-cinema',
                )}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] tracking-[0.25em] uppercase rounded-full bg-gold-gradient text-black font-semibold shadow-gold-glow">
                    Most popular
                  </span>
                )}
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4',
                  p.featured ? 'bg-gold-gradient text-black shadow-gold-glow' : 'glass-gold text-gold-300')}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-2xl">{p.name}</h3>
                <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mt-1">{p.badge}</div>
                {p.blurb && (
                  <p className="text-sm text-luxe/80 mt-4 leading-snug">{p.blurb}</p>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-1.5 mt-5">
                  {p.price !== null ? (
                    <>
                      <span className="font-display text-4xl sm:text-5xl text-gold-gradient leading-none">₹{p.price}</span>
                      <span className="text-xs text-muted-foreground tracking-wider">{p.cycle}</span>
                    </>
                  ) : (
                    <span className="font-display text-3xl sm:text-4xl text-gold-gradient leading-none">{p.cycle}</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 mt-6 mb-7 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-luxe/90">
                      <Check className={cn('w-4 h-4 mt-0.5 shrink-0', p.featured ? 'text-gold-300' : 'text-emerald-300')} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={p.href} className="block">
                  <Button className={cn(
                    'w-full h-11 gap-2',
                    p.featured
                      ? 'bg-gold-gradient text-black hover:opacity-90 shadow-gold-glow'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-gold-500/30 hover:border-gold-500/60',
                  )}>
                    {p.cta} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Footnote */}
        <div className="text-center mt-12 text-[11px] tracking-widest uppercase text-muted-foreground">
          All plans billed monthly · Cancel anytime · Built in Ahmedabad
        </div>
      </div>
    </div>
  )
}
