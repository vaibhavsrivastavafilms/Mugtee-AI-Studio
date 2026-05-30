'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Users } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  FOUNDING_CONTENT_VOLUMES,
  FOUNDING_CREATOR_TYPES,
  FOUNDING_PLATFORMS,
} from '@/lib/founding-creator/constants'
import {
  fetchCreatorMemoryProfile,
  type CreatorMemoryProfile,
} from '@/lib/creator/creator-memory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export function FoundingCreatorProgramSection() {
  const supabase = createSupabaseBrowserClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [platform, setPlatform] = useState('')
  const [creatorType, setCreatorType] = useState('')
  const [volume, setVolume] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const memory = await fetchCreatorMemoryProfile().catch(
          (): CreatorMemoryProfile => ({})
        )
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user && !cancelled) {
            setEmail(user.email || '')
            if (!memory.creatorName) {
              const meta = user.user_metadata || {}
              const fromMeta =
                (meta.full_name as string) || (meta.name as string) || ''
              if (fromMeta) setName(fromMeta)
            }
          }
        }
        if (memory.creatorName && !cancelled) setName(memory.creatorName)

        const res = await fetch('/api/founding-creator', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const app = data.application
          if (app && !cancelled) {
            setName(app.name || '')
            setEmail(app.email || '')
            setPlatform(app.platform || '')
            setCreatorType(app.creator_type || '')
            setVolume(app.volume || '')
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || !platform || !creatorType || !volume) {
      toast.error('Please complete all fields')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/founding-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          platform,
          creator_type: creatorType,
          volume,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      toast.success('Founding Creator application saved')
    } catch (e) {
      toast.error((e as Error).message || 'Could not save application')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      id="founding-creator"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="glass rounded-2xl p-6 sm:p-8 scroll-mt-24"
    >
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-gold-400" />
        <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80">
          Founding Creator Program
        </div>
      </div>
      <h2 className="font-display text-2xl mb-1">Beta access</h2>
      <p className="text-luxe/70 text-sm mb-5">
        Help shape Mugtee&apos;s roadmap. Early creators get priority features and direct input on the studio.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name or channel"
                className="bg-white/[0.03] h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-white/[0.03] h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground">
                Primary platform
              </label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="bg-white/[0.03] h-10">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {FOUNDING_PLATFORMS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground">
                Creator type
              </label>
              <Select value={creatorType} onValueChange={setCreatorType}>
                <SelectTrigger className="bg-white/[0.03] h-10">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {FOUNDING_CREATOR_TYPES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] tracking-wider uppercase text-muted-foreground">
              Monthly content volume
            </label>
            <Select value={volume} onValueChange={setVolume}>
              <SelectTrigger className="bg-white/[0.03] h-10">
                <SelectValue placeholder="Select volume" />
              </SelectTrigger>
              <SelectContent>
                {FOUNDING_CONTENT_VOLUMES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="bg-gold-gradient text-black gap-2 shadow-gold-glow"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Apply to program'}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
