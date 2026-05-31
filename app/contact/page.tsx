import Link from 'next/link'
import { Mail } from 'lucide-react'
import { LuxNav } from '@/components/v2/lux-nav'
import { LuxFooter } from '@/components/v2/lux-footer'

const SUPPORT_EMAIL = 'hello@mugtee.in'

export const metadata = {
  title: 'Contact',
  description: 'Contact Mugtee support for account, billing, and creator workflow questions.',
}

export default function ContactPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--v2-bg)] text-[var(--v2-text-primary)] v2-page-enter">
      <LuxNav />
      <div className="container max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--v2-gold)] mb-3">Support</p>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--v2-text-primary)]">Contact Mugtee</h1>
        <p className="mt-4 text-sm sm:text-base text-[var(--v2-text-secondary)] leading-relaxed">
          Questions about your account, exports, or billing? We typically reply within one business day.
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-8 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] px-5 py-3 text-sm text-[var(--v2-text-primary)] hover:border-[var(--v2-gold)]/40 transition-colors"
        >
          <Mail className="h-4 w-4 text-[var(--v2-gold)]" />
          {SUPPORT_EMAIL}
        </a>
        <p className="mt-8 text-xs text-[var(--v2-text-secondary)]">
          See also{' '}
          <Link href="/privacy" className="text-[var(--v2-gold)] hover:underline">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link href="/terms" className="text-[var(--v2-gold)] hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </div>
      <LuxFooter />
    </div>
  )
}
