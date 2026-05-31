'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LuxButton } from '@/components/v2/lux-button'

const MARKETING_LINKS = [
  { label: 'Demo', href: '/studio/video', homeActive: true },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
] as const

const STUDIO_LINKS = [
  { label: 'Create', href: '/studio/create?mode=quick' },
  { label: 'Projects', href: '/studio/projects' },
  { label: 'Studio', href: '/studio' },
  { label: 'Pricing', href: '/pricing' },
] as const

type LuxNavProps = {
  className?: string
  /** Marketing nav (Demo, Pricing, Blog, About) vs in-app studio nav */
  variant?: 'marketing' | 'studio'
}

export function LuxNav({ className, variant = 'marketing' }: LuxNavProps) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const links = variant === 'studio' ? STUDIO_LINKS : MARKETING_LINKS
  const createHref = '/studio/create?mode=quick'

  const isActive = (href: string, homeActive?: boolean) => {
    if (homeActive && pathname === '/') return true
    const base = href.split('?')[0]
    return pathname === base || pathname.startsWith(base + '/')
  }

  return (
    <header className={cn('sticky top-0 z-50 v2-glass-nav', className)}>
      <div className="mx-auto grid h-[72px] max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-6">
        <Link href="/" className="group flex items-center gap-3 shrink-0 justify-self-start">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--v2-gold)]">
            <span className="font-display text-lg font-black text-black">M</span>
          </div>
          <span className="font-display text-lg tracking-wide text-[var(--v2-text-primary)]">
            MUGTEE
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 justify-self-center">
          {links.map((link) => {
            const active = isActive(link.href, 'homeActive' in link ? link.homeActive : false)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative py-1 text-[11px] tracking-[0.22em] uppercase transition-colors duration-150',
                  active
                    ? 'text-[var(--v2-gold)]'
                    : 'text-[var(--v2-text-secondary)] hover:text-[var(--v2-text-primary)]'
                )}
              >
                {link.label}
                {active ? (
                  <span
                    className="absolute -bottom-1 left-0 right-0 h-px bg-[var(--v2-gold)]"
                    aria-hidden
                  />
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="hidden md:flex items-center gap-4 justify-self-end">
          <Link
            href="/login"
            className="text-[11px] tracking-[0.22em] uppercase text-[var(--v2-text-secondary)] hover:text-[var(--v2-text-primary)] transition-colors duration-150"
          >
            Log in
          </Link>
          <LuxButton href={createHref} size="default" className="rounded-full">
            Start Creating <ArrowRight className="h-3.5 w-3.5" />
          </LuxButton>
        </div>

        <button
          type="button"
          className="md:hidden p-2 text-[var(--v2-text-secondary)] hover:text-[var(--v2-text-primary)] justify-self-end col-start-3"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="md:hidden border-t border-[var(--v2-border)] bg-black/95 px-5 py-4 space-y-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm tracking-wider uppercase text-[var(--v2-text-secondary)] hover:text-[var(--v2-gold)]"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-[var(--v2-border)]">
            <LuxButton href="/login" variant="secondary" className="w-full">
              Log in
            </LuxButton>
            <LuxButton href={createHref} className="w-full rounded-full">
              Start Creating <ArrowRight className="h-3.5 w-3.5" />
            </LuxButton>
          </div>
        </div>
      ) : null}
    </header>
  )
}
