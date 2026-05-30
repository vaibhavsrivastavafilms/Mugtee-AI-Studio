'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[app/error]', error)
    }
  }, [error])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#0B0B0B] text-[#E8D9A8]">
      <div
        className="w-16 h-16 mb-6 rounded-2xl flex items-center justify-center font-bold text-3xl text-[#0B0B0B] bg-gold-gradient"
        aria-hidden
      >
        M
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Something went wrong</h1>
      <p className="text-sm text-[#E8D9A8]/70 max-w-sm mb-6">
        Mugtee hit an unexpected error. Your work is safe — try again or return to the studio.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center h-10 px-5 rounded-full text-sm font-medium bg-gold-gradient text-[#0B0B0B]"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center h-10 px-5 rounded-full text-sm font-medium border border-[#D4AF37]/30 text-[#E8D9A8] hover:border-[#D4AF37]/50"
        >
          Back to studio
        </a>
      </div>
    </main>
  )
}
