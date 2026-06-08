'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  buildEnhancedScenePrompt,
  SCENE_PROMPT_DIRECTION_CHIPS,
} from '@/lib/quick-cut/scene-card-v2-helpers'
import { cn } from '@/lib/utils'

type ScenePromptEditorModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sceneTitle: string
  sceneNumber: number
  originalPrompt: string
  onSave: (enhancedPrompt: string) => Promise<void> | void
}

export function ScenePromptEditorModal({
  open,
  onOpenChange,
  sceneTitle,
  sceneNumber,
  originalPrompt,
  onSave,
}: ScenePromptEditorModalProps) {
  const [additional, setAdditional] = useState('')
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setAdditional('')
    setSelectedChips([])
  }, [open, originalPrompt])

  const enhanced = buildEnhancedScenePrompt(originalPrompt, additional, selectedChips)

  const toggleChip = (chip: string) => {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(enhanced)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border border-gold-500/25 bg-[#0D0D0D] text-luxe shadow-[0_0_40px_rgba(212,175,55,0.08)]">
        <DialogHeader>
          <DialogTitle className="text-left font-display text-lg text-luxe">
            Edit Scene Prompt
          </DialogTitle>
          <p className="text-[11px] text-luxe/50">
            Scene {sceneNumber} · {sceneTitle}
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[9px] tracking-[0.18em] uppercase text-gold-300/60">
              Original Prompt
            </span>
            <textarea
              readOnly
              value={originalPrompt}
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[11px] text-luxe/70 resize-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[9px] tracking-[0.18em] uppercase text-gold-300/60">
              Enhanced Prompt
            </span>
            <textarea
              readOnly
              value={enhanced}
              rows={4}
              className="w-full rounded-lg border border-gold-500/20 bg-gold-500/[0.04] px-3 py-2 text-[11px] text-[#F4E7C1]/90 resize-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[9px] tracking-[0.18em] uppercase text-gold-300/60">
              Additional Direction
            </span>
            <textarea
              value={additional}
              onChange={(e) => setAdditional(e.target.value)}
              rows={2}
              placeholder="Add specific visual direction for this scene…"
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[11px] text-luxe/80 resize-none placeholder:text-luxe/35"
            />
          </label>

          <div className="flex flex-wrap gap-1.5">
            {SCENE_PROMPT_DIRECTION_CHIPS.map((chip) => {
              const active = selectedChips.includes(chip)
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleChip(chip)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] border transition-colors',
                    active
                      ? 'border-gold-500/45 bg-gold-500/12 text-gold-200'
                      : 'border-white/10 text-luxe/55 hover:border-gold-500/25'
                  )}
                >
                  {chip}
                </button>
              )
            })}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-luxe/50 hover:text-luxe/75"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !enhanced.trim()}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gold-500/20 border border-gold-500/35 text-[10px] uppercase tracking-wider text-gold-100 hover:bg-gold-500/30 disabled:opacity-45"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save & Regenerate
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
