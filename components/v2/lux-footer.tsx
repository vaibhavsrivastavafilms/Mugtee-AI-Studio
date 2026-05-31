'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Instagram, Youtube, Twitter, Mail, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STUDIO } from '@/lib/create/routes'

const PRODUCT_LINKS = [
  { label: 'Create', href: '/create?mode=quick' },
  { label: 'Projects', href: '/projects' },
  { label: 'Studio', href: STUDIO.root },
  { label: 'Pricing', href: '/pricing' },
] as const

const SUPPORT_EMAIL = 'hello@mugtee.in'

const COMPANY_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
  { label: 'Support', href: `mailto:${SUPPORT_EMAIL}` },
] as const

const RESOURCE_LINKS = [
  { label: 'Examples', href: '/cinematic/examples/psychology-attention' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
] as const

const SOCIAL = [
  { label: 'Instagram', href: 'https://instagram.com/mugteeaistudio', icon: Instagram },
  { label: 'YouTube', href: 'https://youtube.com/@mugtee', icon: Youtube },
  { label: 'X', href: 'https://x.com/mugtee', icon: Twitter },
  { label: 'Email', href: 'mailto:hello@mugtee.in', icon: Mail },
] as const

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: readonly { label: string; href: string }[]
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--v2-gold)] mb-4">{title}</p>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-[var(--v2-text-secondary)] hover:text-[var(--v2-text-primary)] transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LuxFooter({ className }: { className?: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setStatus('loading')
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'homepage_footer' }),
      })
      if (!res.ok) throw new Error('failed')
      setStatus('done')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <footer className={cn('border-t border-[var(--v2-border)] py-14 px-5 sm:px-6', className)}>
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--v2-gold)]">
                <span className="font-display text-sm font-black text-black">M</span>
              </div>
              <span className="font-display text-base text-[var(--v2-text-primary)]">MUGTEE</span>
            </Link>
            <p className="text-sm text-[var(--v2-text-secondary)] max-w-xs leading-relaxed">
              Stories become cinema — script to reel in one cinematic studio.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {SOCIAL.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith('mailto') ? undefined : '_blank'}
                  rel={href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--v2-border)] text-[var(--v2-text-secondary)] hover:border-[var(--v2-gold)]/40 hover:text-[var(--v2-gold)] transition-colors duration-150"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Resources" links={RESOURCE_LINKS} />

          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--v2-gold)] mb-4">
              Newsletter
            </p>
            <p className="text-sm text-[var(--v2-text-secondary)] mb-3">
              Cinematic drops — no spam.
            </p>
            <form onSubmit={subscribe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                required
                className="flex-1 min-w-0 rounded-lg border border-[var(--v2-border)] bg-black/40 px-3 py-2 text-sm text-[var(--v2-text-primary)] placeholder:text-[var(--v2-text-secondary)]/50 focus:outline-none focus:border-[var(--v2-gold)]/40"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                aria-label="Subscribe"
                className="shrink-0 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-[var(--v2-gold)] text-black hover:opacity-90 disabled:opacity-50 touch-manipulation"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            {status === 'done' ? (
              <p className="mt-2 text-xs text-[var(--v2-gold)]">You&apos;re on the list.</p>
            ) : status === 'error' ? (
              <p className="mt-2 text-xs text-red-400/90">Try again shortly.</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-[var(--v2-border)]">
          <span className="text-[11px] tracking-wider text-[var(--v2-text-secondary)]">
            © {new Date().getFullYear()} Mugtee
          </span>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 sm:gap-6">
            <Link
              href="/contact"
              className="min-h-[44px] inline-flex items-center text-[11px] tracking-wider uppercase text-[var(--v2-text-secondary)] hover:text-[var(--v2-gold)] transition-colors touch-manipulation"
            >
              Contact
            </Link>
            <Link
              href="/privacy"
              className="min-h-[44px] inline-flex items-center text-[11px] tracking-wider uppercase text-[var(--v2-text-secondary)] hover:text-[var(--v2-gold)] transition-colors touch-manipulation"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="min-h-[44px] inline-flex items-center text-[11px] tracking-wider uppercase text-[var(--v2-text-secondary)] hover:text-[var(--v2-gold)] transition-colors touch-manipulation"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
