'use client'
// Phase 7C — Viral Content Generation Dialog
// Compact cinematic UI: script generator + hook generator + caption generator.
// Reuses glass UI, gold theme, dialog primitives. Production-ready.

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { track } from '@/lib/posthog'
import { Sparkles, Copy, Loader2, Check } from 'lucide-react'
import {
  generateViralScript,
  generateHooks,
  generateCaptions,
} from '@/lib/ai/generation'
import { saveContentPiece } from '@/lib/supabase/content-pieces'

type TabType = 'script' | 'hooks' | 'captions'

interface GenerationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (id: string) => void
}

export function GenerationDialog({ open, onOpenChange, onSaved }: GenerationDialogProps) {
  const [tab, setTab] = useState<TabType>('script')
  const [topic, setTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [output, setOutput] = useState<string | string[]>('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic or idea')
      return
    }

    setGenerating(true)
    try {
      let result: string | string[] = ''
      const topicTrim = topic.trim()

      if (tab === 'script') {
        result = await generateViralScript(topicTrim)
        track('generation_viral_script_clicked', { topic_length: topicTrim.length })
      } else if (tab === 'hooks') {
        result = await generateHooks(topicTrim, 5)
        track('generation_hooks_clicked', { topic_length: topicTrim.length })
      } else if (tab === 'captions') {
        result = await generateCaptions(topicTrim, 3)
        track('generation_captions_clicked', { topic_length: topicTrim.length })
      }

      setOutput(result)
      toast.success('Generation complete')
    } catch (e: any) {
      toast.error(e?.message || 'Generation failed')
      track('generation_failed', { tab, error: String(e?.message || '').slice(0, 120) })
    } finally {
      setGenerating(false)
    }
  }, [topic, tab])

  const handleCopy = useCallback(() => {
    const text = Array.isArray(output) ? output.join('\n\n') : output
    if (!text) return

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    })
  }, [output])

  const handleSave = useCallback(async () => {
    if (!output) return
    setSaving(true)
    try {
      const text = Array.isArray(output) ? output.join('\n\n') : output
      const payload =
        tab === 'script'
          ? { script: text, title: `Viral Script — ${topic.slice(0, 40)}` }
          : tab === 'hooks'
            ? { description: text, title: `Hooks — ${topic.slice(0, 40)}` }
            : { notes: text, title: `Captions — ${topic.slice(0, 40)}` }

      const { id } = await saveContentPiece(payload)
      toast.success('Saved to your content library')
      track('generation_saved', { tab, content_type: tab })
      onOpenChange(false)
      setTopic('')
      setOutput('')
      onSaved?.(id)
    } catch (e: any) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [output, tab, topic, onOpenChange, onSaved])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-black/95 border-white/[0.06] backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-luxe font-display text-xl">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-400" /> Viral Content Generator
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input */}
          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
              Your idea
            </label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Describe a cinematic emotion, memory, or story idea..."
              className="min-h-[80px] bg-white/[0.03] border-white/[0.08] text-luxe placeholder:text-luxe/30 focus-visible:ring-gold-500/40 resize-none"
              disabled={generating || saving}
            />
          </div>

          {/* Generation Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabType)} className="space-y-3">
            <TabsList className="grid grid-cols-3 bg-white/[0.03] border border-white/[0.06] h-9">
              <TabsTrigger value="script" className="text-[11px] font-medium tracking-[0.02em]">
                Script
              </TabsTrigger>
              <TabsTrigger value="hooks" className="text-[11px] font-medium tracking-[0.02em]">
                Hooks
              </TabsTrigger>
              <TabsTrigger value="captions" className="text-[11px] font-medium tracking-[0.02em]">
                Captions
              </TabsTrigger>
            </TabsList>

            {/* Output Display */}
            {(['script', 'hooks', 'captions'] as const).map((t) => (
              <TabsContent key={t} value={t} className="space-y-3">
                {generating && tab === t ? (
                  <div className="space-y-2">
                    <p className="text-[11px] tracking-[0.04em] text-gold-300/75 inline-flex items-center gap-2">
                      <span className="inline-block w-1 h-1 rounded-full bg-gold-400 animate-pulse" />
                      Generating {t}…
                    </p>
                    <Skeleton className="h-4 w-3/4 bg-white/[0.04]" />
                    <Skeleton className="h-4 w-full bg-white/[0.04]" />
                    <Skeleton className="h-4 w-5/6 bg-white/[0.04]" />
                  </div>
                ) : output && tab === t ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                      {Array.isArray(output) ? (
                        <div className="space-y-2">
                          {output.map((item, i) => (
                            <div
                              key={i}
                              className="text-[12.5px] leading-relaxed text-luxe/85 p-2 rounded border border-white/[0.04] bg-white/[0.02]"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.75] text-luxe/90 font-sans tracking-[0.005em]">
                          {output}
                        </pre>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopy}
                        disabled={saving}
                        className="h-8 gap-1.5 text-[11.5px] border-gold-500/30 hover:border-gold-500/60 text-luxe hover:text-gold-200 flex-1"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="h-8 gap-1.5 text-[11.5px] bg-gold-gradient text-black hover:opacity-90 shadow-gold-glow flex-1"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" /> Save to Library
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="min-h-[160px] rounded-xl border border-dashed border-white/[0.06] bg-black/20 flex flex-col items-center justify-center text-center p-6">
                    <Sparkles className="w-5 h-5 text-gold-400/40 mb-2" />
                    <p className="text-[12px] text-luxe/60 italic">
                      Generate {t} for your idea
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generating || !topic.trim() || saving}
            className="w-full h-11 gap-2 bg-gold-gradient text-black hover:opacity-90 shadow-gold-glow disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Mugtee is creating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
