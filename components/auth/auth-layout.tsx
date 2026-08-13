'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { MugteeOrb } from '@/components/mugtee/mugtee-orb'
import { AuthStatus } from '@/components/auth/auth-status'

type AuthLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[var(--v2-bg)] px-5 py-12 safe-area-pad sm:px-6">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(212,175,55,0.08),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_90%,rgba(255,255,255,0.03),transparent_60%)]" />
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <header className="mb-10 text-center">
          <MugteeOrb state="idle" size={96} useLogo className="mx-auto mb-7" />
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--v2-gold)]">
            Mugtee
          </p>
          <h1 className="font-display text-3xl text-[var(--v2-text-primary)] sm:text-4xl">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--v2-text-secondary)]">
            {subtitle}
          </p>
        </header>

        <AuthStatus />

        <div className="rounded-3xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-8 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.55)] sm:p-10">
          {children}
        </div>

        {footer ?? (
          <p className="mt-6 text-center text-[10px] leading-relaxed text-[var(--v2-text-secondary)]">
            By continuing you accept our{' '}
            <Link href="/terms" className="text-[var(--v2-gold)]/90 hover:underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-[var(--v2-gold)]/90 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        )}
      </motion.div>
    </div>
  )
}
