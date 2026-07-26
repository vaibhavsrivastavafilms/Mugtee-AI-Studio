'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Home, RefreshCw } from 'lucide-react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { APP_ROUTE_LOGIN_FALLBACK } from '@/lib/auth/public-routes'

type AuthUnavailableProps = {
  demoHref?: string
  onRetry?: () => void
}

export function AuthUnavailable({
  demoHref = APP_ROUTE_LOGIN_FALLBACK,
  onRetry,
}: AuthUnavailableProps) {
  const router = useRouter()

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
      return
    }
    router.refresh()
    router.push('/auth/login')
  }

  return (
    <AuthLayout
      title="Mugtee Studio is temporarily unavailable"
      subtitle="Our authentication service is currently unavailable. Please try again later or contact the administrator."
      footer={
        <p className="mt-6 text-center text-[10px] leading-relaxed text-[var(--v2-text-secondary)]">
          This is a temporary infrastructure issue — not a problem with your account.
        </p>
      }
    >
      <div className="space-y-3" role="alert" aria-live="polite">
        <button
          type="button"
          onClick={handleRetry}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)] touch-manipulation"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Retry
        </button>

        <Link
          href="/"
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--v2-border)] text-sm font-medium text-[var(--v2-text-primary)] transition-colors hover:border-[var(--v2-gold)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)] touch-manipulation"
        >
          <Home className="h-4 w-4" aria-hidden />
          Return Home
        </Link>

        <Link
          href={demoHref}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[rgba(212,175,55,0.35)] bg-[#D4AF37]/10 text-sm font-medium text-[#D4AF37] transition-colors hover:bg-[#D4AF37]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-gold)] touch-manipulation"
        >
          Continue in Demo Mode
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </AuthLayout>
  )
}
