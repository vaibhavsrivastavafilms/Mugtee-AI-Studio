'use client'
// Phase P11 — Reusable premium empty state.
// Cinematic, minimal, creator-focused. Drop into any list/section with zero data.
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type CTA = { label: string; href?: string; onClick?: () => void; variant?: 'gold' | 'soft' }

export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  primary,
  secondary,
  className,
  size = 'md',
}: {
  icon: any
  eyebrow?: string
  title: string
  description?: string
  primary?: CTA
  secondary?: CTA
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sz = size === 'lg' ? 'py-14 sm:py-20' : size === 'sm' ? 'py-8' : 'py-10 sm:py-14'
  const iconSize = size === 'lg' ? 'w-7 h-7' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const iconBox  = size === 'lg' ? 'w-16 h-16' : size === 'sm' ? 'w-10 h-10' : 'w-12 h-12'
  const titleSz  = size === 'lg' ? 'text-3xl sm:text-4xl' : size === 'sm' ? 'text-xl' : 'text-2xl sm:text-3xl'

  const renderCTA = (cta: CTA, kind: 'primary' | 'secondary') => {
    const styles = kind === 'primary'
      ? 'bg-gold-gradient text-black hover:opacity-90 shadow-gold-glow'
      : 'bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-gold-500/30 hover:border-gold-500/60'
    const inner = (
      <span className={cn('inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium tracking-wide transition', styles)}>
        {cta.label} <ArrowRight className="w-3.5 h-3.5" />
      </span>
    )
    if (cta.href) return <Link href={cta.href}>{inner}</Link>
    return <button onClick={cta.onClick}>{inner}</button>
  }

  return (
    <div className={cn('glass rounded-2xl text-center px-6 border border-white/[0.05]', sz, className)}>
      <div className={cn('mx-auto rounded-2xl glass-gold flex items-center justify-center mb-4', iconBox)}>
        <Icon className={cn(iconSize, 'text-gold-300')} />
      </div>
      {eyebrow && <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 mb-2">{eyebrow}</div>}
      <h3 className={cn('font-display mb-2', titleSz)}>{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-5">{description}</p>}
      {(primary || secondary) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {primary   && renderCTA(primary,   'primary')}
          {secondary && renderCTA(secondary, 'secondary')}
        </div>
      )}
    </div>
  )
}
