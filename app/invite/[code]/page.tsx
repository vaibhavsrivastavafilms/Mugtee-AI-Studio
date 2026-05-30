'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  REFERRAL_COOKIE_MAX_AGE_SEC,
  REFERRAL_COOKIE_NAME,
  REFERRAL_STORAGE_KEY,
} from '@/lib/referral/constants'

function persistReferralCode(code: string) {
  const normalized = code.trim().toUpperCase().slice(0, 32)
  if (!normalized) return
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, normalized)
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${REFERRAL_COOKIE_NAME}=${encodeURIComponent(normalized)}; path=/; max-age=${REFERRAL_COOKIE_MAX_AGE_SEC}; SameSite=Lax`
  } catch {
    /* ignore */
  }
}

export default function InviteLandingPage() {
  const params = useParams()
  const code = String(params?.code || '').trim()

  useEffect(() => {
    if (!code) return
    persistReferralCode(code)
    fetch('/api/referral/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).catch(() => {})
  }, [code])

  const loginNext = `/studio/create?mode=quick&ref=${encodeURIComponent(code)}`

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-16 bg-[#0a0a0b]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass rounded-2xl p-8 sm:p-10 text-center border border-gold-soft/20"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-soft/30 mb-4">
          <UserPlus className="w-6 h-6 text-gold-400" />
        </div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 mb-2">
          Mugtee AI Studio
        </p>
        <h1 className="font-display text-3xl mb-2">
          You&apos;re invited to <span className="text-gold-gradient">create</span>
        </h1>
        <p className="text-sm text-luxe/65 mb-6">
          A creator shared Mugtee with you. Sign up with Google to start your studio — your invite
          is saved automatically.
        </p>
        {code ? (
          <p className="text-[11px] font-mono text-muted-foreground mb-6">Invite: {code}</p>
        ) : null}
        <Button asChild className="w-full bg-gold-gradient text-black hover:opacity-90 h-11">
          <Link href={`/auth/login?next=${encodeURIComponent(loginNext)}`}>
            <Sparkles className="w-4 h-4 mr-2" />
            Get started free
          </Link>
        </Button>
        <p className="text-[11px] text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-gold-300/90 hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </main>
  )
}
