'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sparkles, Film, ArrowRight } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { LoginSlideshow } from '@/components/auth/login-slideshow'
import { track } from '@/lib/posthog'
import { Suspense } from 'react'

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const params = useSearchParams()

  useEffect(() => {
    if (params.get('error')) toast.error('Sign-in failed. Please try again.')
  }, [params])

  const handleGoogle = async () => {
    setLoading(true)

    track('signup_started', {
      provider: 'google',
      source: 'login_page'
    })

    const supabase = createSupabaseBrowserClient()

    const redirectTo =
      `${window.location.origin}/auth/callback?next=/workspace&welcome=1`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })

    if (error) {
      toast.error('Could not start Google sign-in: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center px-4 sm:px-6 py-8 safe-area-pad">
      {/* your existing JSX remains EXACTLY here */}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}