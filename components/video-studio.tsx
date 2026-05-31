'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clapperboard,
  Copy,
  Download,
  FileJson,
  FileText,
  Film,
  Loader2,
  Sparkles,
  Video,
  Check,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { quickCutStudioHref } from '@/lib/create/routes'
import type { VideoGeneratorOutput, VideoScene } from '@/app/api/ai/video-generator/route'
import {
  TEXT_TO_VIDEO_DEMO_TEMPLATES,
  TEXT_TO_VIDEO_STUDIO_DEMO_ONLY,
  type TextToVideoDemoTemplate,
  type TextToVideoDemoTemplateId,
} from '@/lib/demo/text-to-video-templates'
import {
  runTextToVideoDemoPipeline,
  type TextToVideoDemoProgress,
  type TextToVideoTimelineStep,
} from '@/lib/demo/run-text-to-video-demo'
import { CinematicTimeline } from '@/components/v2/cinematic-timeline'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type PreviewSection = 'hook' | 'voiceover' | 'storyboard' | 'visuals' | 'thumbnail' | 'export'

const SECTIONS: { id: PreviewSection; label: string; icon: typeof Film }[] = [
  { id: 'hook', label: 'Hook', icon: Sparkles },
  { id: 'voiceover', label: 'Voiceover', icon: Film },
  { id: 'storyboard', label: 'Storyboard', icon: Clapperboard },
  { id: 'visuals', label: 'Visual Prompts', icon: Video },
  { id: 'thumbnail', label: 'Thumbnail', icon: Sparkles },
  { id: 'export', label: 'Export', icon: Download },
]

const triggerClassName =
  'h-9 text-xs bg-black/30 border-white/[0.08] text-luxe/85 hover:border-gold-500/25 focus:ring-gold-500/20'

function slugify(title: string): string {
  return (
    title
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
      .toLowerCase() || 'video-package'
  )
}

function buildFullScript(output: VideoGeneratorOutput): string {
  const lines = [
    output.title,
    '',
    'HOOK',
    output.hook,
    '',
    'VOICEOVER',
    output.voiceover,
    '',
    'SCENES',
    ...output.scenes.map(
      (s) =>
        `Scene ${s.sceneNumber} (${s.duration})\n${s.narration}\nCamera: ${s.cameraMovement}\nVisual: ${s.visualPrompt}`
    ),
    '',
    'CAPTIONS',
    ...output.captions.map((c) => `- ${c}`),
    '',
    'HASHTAGS',
    output.hashtags.join(' '),
  ]
  return lines.join('\n')
}

function buildMarkdown(output: VideoGeneratorOutput): string {
  const lines = [
    `# ${output.title}`,
    '',
    '## Hook',
    output.hook,
    '',
    '## Voiceover',
    output.voiceover,
    '',
    '## Storyboard',
    ...output.scenes.map(
      (s) =>
        `### Scene ${s.sceneNumber} — ${s.duration}\n\n${s.narration}\n\n- **Camera:** ${s.cameraMovement}\n- **Visual:** ${s.visualPrompt}`
    ),
    '',
    '## Thumbnail',
    output.thumbnailPrompt,
    '',
    '## Captions',
    ...output.captions.map((c) => `- ${c}`),
    '',
    '## Hashtags',
    output.hashtags.join(' '),
  ]
  return lines.join('\n')
}

function downloadText(content: string, filename: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function GlassPanel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gold-soft/80 bg-white/[0.02] backdrop-blur-md',
        'shadow-[0_8px_32px_-12px_rgba(0,0,0,0.55)]',
        className
      )}
    >
      {children}
    </div>
  )
}

function SceneCard({
  scene,
  imageUrl,
}: {
  scene: VideoScene
  imageUrl?: string
}) {
  return (
    <article className="rounded-xl border border-white/[0.06] bg-black/30 overflow-hidden">
      {imageUrl ? (
        <div className="relative aspect-video bg-black/50">
          <Image
            src={imageUrl}
            alt={`Scene ${scene.sceneNumber} storyboard frame`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 640px"
            unoptimized
          />
        </div>
      ) : null}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] tracking-[0.28em] uppercase text-gold-300/90">
            Scene {scene.sceneNumber}
          </span>
          <span className="text-[10px] tracking-[0.18em] uppercase text-luxe/45">
            {scene.duration}
          </span>
        </div>
        <p className="text-sm text-luxe/90 leading-relaxed">{scene.narration}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="px-2 py-0.5 rounded-md border border-white/[0.06] bg-black/25 text-[9px] tracking-[0.14em] uppercase text-luxe/45">
            {scene.cameraMovement}
          </span>
        </div>
      </div>
    </article>
  )
}

function DemoTemplateSelector({
  value,
  onChange,
}: {
  value: TextToVideoDemoTemplateId
  onChange: (id: TextToVideoDemoTemplateId) => void
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="text-to-video-template"
        className="text-[9px] tracking-[0.24em] uppercase text-luxe/45"
      >
        Demo template
      </label>
      <Select value={value} onValueChange={(id) => onChange(id as TextToVideoDemoTemplateId)}>
        <SelectTrigger
          id="text-to-video-template"
          aria-label="Text to video demo template"
          className={cn(triggerClassName, 'border-gold-500/35 text-gold-200')}
        >
          <SelectValue placeholder="Choose template" />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-white/[0.08] text-luxe/90">
          {TEXT_TO_VIDEO_DEMO_TEMPLATES.map((template) => (
            <SelectItem
              key={template.id}
              value={template.id}
              className="text-xs focus:bg-gold-500/10 focus:text-gold-200"
            >
              {template.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function VideoStudio() {
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<TextToVideoDemoTemplateId>('ancient-egypt-daily-life')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState<VideoGeneratorOutput | null>(null)
  const [activeTemplate, setActiveTemplate] = useState<TextToVideoDemoTemplate | null>(null)
  const [activeSection, setActiveSection] = useState<PreviewSection>('hook')
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [pipelineProgress, setPipelineProgress] = useState<TextToVideoDemoProgress | null>(null)
  const [timelineStep, setTimelineStep] = useState<TextToVideoTimelineStep>('analyzing')

  const abortRef = useRef<AbortController | null>(null)

  const selectedTemplate = useMemo(
    () => TEXT_TO_VIDEO_DEMO_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? TEXT_TO_VIDEO_DEMO_TEMPLATES[0],
    [selectedTemplateId]
  )

  useEffect(() => {
    setInput(selectedTemplate.topic)
  }, [selectedTemplate])

  const canGenerate =
    (input.trim().length >= 6 || Boolean(selectedTemplateId)) && !loading

  const quickCutHref = useMemo(
    () =>
      quickCutStudioHref({
        topic: output?.title || input.trim() || selectedTemplate.topic,
      }),
    [output?.title, input, selectedTemplate.topic]
  )

  const handleTemplateChange = useCallback((id: TextToVideoDemoTemplateId) => {
    setSelectedTemplateId(id)
    const template = TEXT_TO_VIDEO_DEMO_TEMPLATES.find((t) => t.id === id)
    if (template) {
      setInput(template.topic)
      setOutput(null)
      setActiveTemplate(null)
      setStep(1)
      setError(null)
    }
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!TEXT_TO_VIDEO_STUDIO_DEMO_ONLY) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setCopied(false)
    setOutput(null)
    setActiveTemplate(null)
    setStep(2)
    setPipelineProgress(null)
    setTimelineStep('analyzing')

    try {
      const template = await runTextToVideoDemoPipeline(selectedTemplateId, {
        topic: input.trim() || selectedTemplate.topic,
        signal: controller.signal,
        onProgress: (progress) => {
          setPipelineProgress(progress)
          setTimelineStep(progress.timelineStep)
        },
      })

      setActiveTemplate(template)
      setOutput(template.output)
      setStep(3)
      setActiveSection('hook')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setStep(1)
      setError(err instanceof Error ? err.message : 'Demo pipeline failed')
    } finally {
      setLoading(false)
      setPipelineProgress(null)
    }
  }, [input, selectedTemplateId, selectedTemplate.topic])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const handleCopyScript = useCallback(async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(buildFullScript(output))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy to clipboard')
    }
  }, [output])

  const handleDownloadTxt = useCallback(() => {
    if (!output) return
    downloadText(buildFullScript(output), `${slugify(output.title)}.txt`)
  }, [output])

  const handleDownloadMarkdown = useCallback(() => {
    if (!output) return
    downloadText(buildMarkdown(output), `${slugify(output.title)}.md`, 'text/markdown')
  }, [output])

  const handleExportStoryboard = useCallback(() => {
    if (!output) return
    const payload = {
      format: 'mugtee-video-studio-v1',
      demo: true,
      templateId: activeTemplate?.id ?? selectedTemplateId,
      exportedAt: new Date().toISOString(),
      ...output,
    }
    downloadText(
      JSON.stringify(payload, null, 2),
      `${slugify(output.title)}-storyboard.json`,
      'application/json'
    )
  }, [output, activeTemplate?.id, selectedTemplateId])

  return (
    <div className="min-h-[calc(100dvh-4rem)] max-w-5xl mx-auto w-full px-1 sm:px-0 py-6 sm:py-8 pb-[max(5rem,env(safe-area-inset-bottom))]">
      <header className="mb-8 sm:mb-10 text-center px-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-gold-500/25 text-[10px] tracking-[0.28em] uppercase text-gold-300 mb-4">
          <Video className="w-3 h-3" aria-hidden />
          Text To Video Studio
        </div>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-[#F4E7C1]/95 leading-snug">
          From Idea to{' '}
          <span className="text-gold-gradient">Cinematic Video</span>
        </h1>
        <p className="mt-3 text-sm sm:text-base text-luxe/60 max-w-xl mx-auto leading-relaxed">
          Pick a demo template or enter a topic. Mugtee replays the full pipeline — hook, script,
          storyboard, voice, and export — with cached cinematic output. No API spend in demo mode.
        </p>
        {TEXT_TO_VIDEO_STUDIO_DEMO_ONLY ? (
          <p className="mt-2 text-[10px] tracking-[0.22em] uppercase text-gold-400/60">
            Demo mode · cached templates only
          </p>
        ) : null}
      </header>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
        {[
          { n: 1 as const, label: 'Input' },
          { n: 2 as const, label: 'Generate' },
          { n: 3 as const, label: 'Video' },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-2 sm:gap-4">
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] tracking-[0.18em] uppercase transition-colors',
                step >= n
                  ? 'border-gold-500/40 bg-gold-500/10 text-gold-200'
                  : 'border-white/[0.06] text-luxe/40'
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium',
                  step >= n ? 'bg-gold-gradient text-black' : 'bg-white/[0.06] text-luxe/50'
                )}
              >
                {n}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < 2 ? (
              <div
                className={cn(
                  'w-6 sm:w-10 h-px',
                  step > n ? 'bg-gold-500/50' : 'bg-white/[0.08]'
                )}
                aria-hidden
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* Step 1: Input */}
      <GlassPanel className="p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 sm:gap-6 mb-4">
          <DemoTemplateSelector value={selectedTemplateId} onChange={handleTemplateChange} />
          <div className="flex items-end">
            <p className="text-xs text-luxe/50 leading-relaxed pb-1">
              {selectedTemplate.tagline}
            </p>
          </div>
        </div>

        <label htmlFor="video-studio-input" className="block text-[10px] tracking-[0.28em] uppercase text-gold-300/85 mb-3">
          Topic or Script
        </label>
        <textarea
          id="video-studio-input"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            if (step > 1 && !output) setStep(1)
          }}
          placeholder="What daily life looked like in Ancient Egypt along the Nile…"
          rows={5}
          className={cn(
            'w-full rounded-xl px-4 py-3 text-sm leading-relaxed resize-y min-h-[120px]',
            'bg-black/40 border border-white/[0.08] text-luxe placeholder:text-luxe/35',
            'focus:outline-none focus:border-gold-500/45 focus:shadow-[0_0_24px_-6px_rgba(212,175,55,0.25)]'
          )}
        />
        {error ? (
          <p className="mt-3 text-sm text-red-400/90" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!canGenerate}
            className={cn(
              'flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl',
              'bg-gold-gradient text-black font-medium text-sm shadow-gold-glow',
              'hover:opacity-95 active:scale-[0.98] transition-all',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100'
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {pipelineProgress?.label ?? 'Shaping cinematic package…'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Cinematic Package
              </>
            )}
          </button>
        </div>
      </GlassPanel>

      {/* Step 2: Live pipeline */}
      <AnimatePresence>
        {loading ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-8"
          >
            <GlassPanel className="p-4 sm:p-6 space-y-5">
              <div className="text-center">
                <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/75 mb-2">
                  Mugtee engine · demo replay
                </p>
                <p className="font-display text-lg sm:text-xl text-luxe/90 italic">
                  {pipelineProgress?.label ?? 'Starting pipeline…'}
                </p>
              </div>
              <CinematicTimeline currentStep={timelineStep} />
              {pipelineProgress ? (
                <div className="flex items-center justify-center gap-2 text-xs text-luxe/45">
                  <ChevronDown className="w-3.5 h-3.5 animate-bounce text-gold-400/70" />
                  <span>{pipelineProgress.progress}% complete</span>
                </div>
              ) : null}
            </GlassPanel>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Step 2 & 3: Output */}
      <AnimatePresence>
        {output && activeTemplate ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-6 sm:mt-8 pt-8 sm:pt-10 border-t border-white/[0.06] space-y-6"
          >
            {/* Video preview poster — step 3 */}
            {step >= 3 ? (
              <GlassPanel className="overflow-hidden p-0">
                <div className="relative aspect-video bg-black/60">
                  <Image
                    src={activeTemplate.previewVideoPoster}
                    alt={`${output.title} preview`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 896px"
                    unoptimized
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-1">
                      Demo preview · {activeTemplate.voicePreview.voiceName}
                    </p>
                    <p className="font-display text-lg sm:text-xl text-luxe">{output.title}</p>
                  </div>
                </div>
              </GlassPanel>
            ) : null}

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/75 mb-1">
                  Generated Package
                </p>
                <h2 className="font-display text-xl sm:text-2xl text-luxe">{output.title}</h2>
                <p className="mt-1 text-xs text-luxe/45 italic">
                  Demo mode — cached template &ldquo;{activeTemplate.title}&rdquo;. Sign in to Quick
                  Cut for live generation.
                </p>
              </div>
              <Link
                href={quickCutHref}
                className={cn(
                  'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl',
                  'border border-gold-500/35 bg-gold-500/[0.08] text-gold-200',
                  'text-[11px] tracking-[0.12em] uppercase font-medium',
                  'hover:bg-gold-500/15 hover:border-gold-500/50 transition-all'
                )}
              >
                <Clapperboard className="w-4 h-4" />
                Generate Video in Quick Cut
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </Link>
            </div>

            {/* Voice preview metadata */}
            <GlassPanel className="p-4 sm:p-5">
              <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/85 mb-3">
                Voice preview
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-luxe/75">
                <span>{activeTemplate.voicePreview.voiceName}</span>
                <span className="text-luxe/30">·</span>
                <span className="text-xs uppercase tracking-wider text-luxe/45">
                  {activeTemplate.voicePreview.style.replace(/_/g, ' ')}
                </span>
                <span className="text-luxe/30">·</span>
                <span className="text-xs text-luxe/45">
                  ~{activeTemplate.voicePreview.durationSec}s narration
                </span>
              </div>
              <div className="mt-4 flex items-end gap-0.5 h-8">
                {activeTemplate.voicePreview.waveform.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full bg-gold-500/40"
                    style={{ height: `${Math.max(12, h * 100)}%` }}
                  />
                ))}
              </div>
            </GlassPanel>

            {/* Section tabs */}
            <nav className="flex gap-1 overflow-x-auto pb-1 scroll-touch scrollbar-luxe -mx-0.5 px-0.5">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-full text-sm whitespace-nowrap transition-all shrink-0 border',
                    activeSection === id
                      ? 'bg-gold-500/15 border-gold-500/35 text-gold-200 shadow-[0_0_20px_-8px_rgba(212,175,55,0.5)]'
                      : 'text-muted-foreground hover:text-luxe border-white/[0.06] hover:border-gold-500/20 hover:bg-white/[0.03]'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4',
                      activeSection === id ? 'text-gold-300' : 'text-muted-foreground'
                    )}
                  />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </nav>

            <GlassPanel className="p-4 sm:p-6">
              {activeSection === 'hook' ? (
                <div className="space-y-4">
                  <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/85">Hook — 0–3s</p>
                  <p className="font-display text-lg sm:text-xl italic text-luxe/95 leading-relaxed">
                    &ldquo;{output.hook}&rdquo;
                  </p>
                </div>
              ) : null}

              {activeSection === 'voiceover' ? (
                <div className="space-y-4">
                  <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/85">Full Voiceover</p>
                  <div className="text-sm text-luxe/85 leading-relaxed whitespace-pre-wrap">
                    {output.voiceover}
                  </div>
                </div>
              ) : null}

              {activeSection === 'storyboard' ? (
                <div className="space-y-4">
                  <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/85">
                    Storyboard — {output.scenes.length} scenes
                  </p>
                  <div className="grid gap-3 sm:gap-4">
                    {output.scenes.map((scene, index) => (
                      <SceneCard
                        key={scene.sceneNumber}
                        scene={scene}
                        imageUrl={activeTemplate.sceneImageUrls[index]}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {activeSection === 'visuals' ? (
                <div className="space-y-4">
                  <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/85">
                    Visual Prompts
                  </p>
                  <div className="space-y-3">
                    {output.scenes.map((scene) => (
                      <div
                        key={scene.sceneNumber}
                        className="rounded-xl border border-white/[0.06] bg-black/25 p-4"
                      >
                        <span className="text-[10px] tracking-[0.22em] uppercase text-gold-300/75">
                          Scene {scene.sceneNumber}
                        </span>
                        <p className="mt-2 text-xs sm:text-sm text-luxe/70 leading-relaxed font-mono">
                          {scene.visualPrompt}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeSection === 'thumbnail' ? (
                <div className="space-y-4">
                  <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/85">
                    Thumbnail Prompt
                  </p>
                  <p className="text-sm text-luxe/80 leading-relaxed font-mono">
                    {output.thumbnailPrompt}
                  </p>
                  {output.captions.length > 0 ? (
                    <>
                      <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/85 pt-2">
                        On-Screen Captions
                      </p>
                      <ul className="space-y-2">
                        {output.captions.map((caption) => (
                          <li
                            key={caption}
                            className="text-sm text-luxe/75 pl-3 border-l-2 border-gold-500/30"
                          >
                            {caption}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {output.hashtags.length > 0 ? (
                    <p className="text-xs text-luxe/50 pt-2">{output.hashtags.join(' ')}</p>
                  ) : null}
                </div>
              ) : null}

              {activeSection === 'export' ? (
                <div className="space-y-5">
                  <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/85">
                    Export Package
                  </p>
                  <p className="text-sm text-luxe/60 leading-relaxed">
                    Download or copy your cinematic demo package. For full video render with voice and
                    storyboard frames, continue in Quick Cut (live generation for signed-in users).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => void handleCopyScript()}
                      className={cn(
                        'min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl',
                        'border border-white/[0.08] bg-white/[0.03] text-sm text-luxe',
                        'hover:border-gold-500/30 hover:bg-gold-500/[0.06] transition-all'
                      )}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-gold-300" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copy Script
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className={cn(
                        'min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl',
                        'border border-white/[0.08] bg-white/[0.03] text-sm text-luxe',
                        'hover:border-gold-500/30 hover:bg-gold-500/[0.06] transition-all'
                      )}
                    >
                      <FileText className="w-4 h-4" /> Download TXT
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadMarkdown}
                      className={cn(
                        'min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl',
                        'border border-white/[0.08] bg-white/[0.03] text-sm text-luxe',
                        'hover:border-gold-500/30 hover:bg-gold-500/[0.06] transition-all'
                      )}
                    >
                      <Download className="w-4 h-4" /> Download Markdown
                    </button>
                    <button
                      type="button"
                      onClick={handleExportStoryboard}
                      className={cn(
                        'min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl',
                        'border border-white/[0.08] bg-white/[0.03] text-sm text-luxe',
                        'hover:border-gold-500/30 hover:bg-gold-500/[0.06] transition-all'
                      )}
                    >
                      <FileJson className="w-4 h-4" /> Export Storyboard
                    </button>
                  </div>

                  <div className="rounded-xl border border-gold-500/25 bg-gold-500/[0.06] p-4 sm:p-5">
                    <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-2">
                      Package Ready
                    </p>
                    <p className="text-sm text-luxe/75 leading-relaxed mb-4">
                      Your hook, voiceover, and {output.scenes.length} scene prompts are ready.
                      Quick Cut will generate storyboard frames, voiceover audio, and optional MP4
                      assembly.
                    </p>
                    <Link
                      href={quickCutHref}
                      className={cn(
                        'w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl',
                        'bg-gold-gradient text-black font-medium text-sm shadow-gold-glow',
                        'hover:opacity-95 transition-all'
                      )}
                    >
                      <Clapperboard className="w-4 h-4" />
                      Open in Quick Cut
                    </Link>
                  </div>
                </div>
              ) : null}
            </GlassPanel>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
