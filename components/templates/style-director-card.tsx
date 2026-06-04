'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, Palette, Users, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStyleTemplateById } from '@/lib/templates/style-templates'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { StyleLibraryDrawer } from '@/components/templates/style-library-drawer'

type StyleDirectorCardProps = {
  className?: string
  variant?: 'default' | 'compact'
}

function StatusRow({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-[11px]">
      <span className="text-luxe/45 shrink-0">{label}</span>
      <span
        className={cn(
          'text-right leading-snug',
          ok ? 'text-emerald-300/85' : 'text-luxe/55'
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function StyleDirectorCard({ className, variant = 'default' }: StyleDirectorCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const styleTemplateId = useQuickCutGenerationStore((s) => s.styleTemplateId)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const outputAlignmentControls = useQuickCutGenerationStore((s) => s.outputAlignmentControls)
  const applyStyleTemplate = useQuickCutGenerationStore((s) => s.applyStyleTemplate)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const setPanelPreferences = useStudioWorkspaceStore((s) => s.setPanelPreferences)

  useEffect(() => {
    const open = () => setDrawerOpen(true)
    window.addEventListener('mugtee:open-style-drawer', open)
    return () => window.removeEventListener('mugtee:open-style-drawer', open)
  }, [])

  const template = getStyleTemplateById(styleTemplateId)

  const drawer = (
    <StyleLibraryDrawer
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      selectedId={styleTemplateId}
      ideaForRecommend={prompt}
      onSelect={(t) => {
        applyStyleTemplate(t.id)
        setPanelPreferences({ styleLibraryCollapsed: true })
        setDrawerOpen(false)
      }}
    />
  )

  if (!template) {
    if (variant === 'compact') {
      return (
        <div className={cn('space-y-2', className)}>
          <p className="text-[11px] text-luxe/55">No style preset</p>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="h-7 px-2.5 rounded-md border border-gold-500/30 bg-gold-500/10 text-[9px] tracking-[0.16em] uppercase text-gold-100 hover:bg-gold-500/15 transition"
          >
            Change
          </button>
          {drawer}
        </div>
      )
    }
    return (
      <div className={cn('rounded-xl border border-white/[0.06] bg-black/40 p-3 space-y-2', className)}>
        <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/65">Current style</p>
        <p className="text-[11px] text-luxe/55 leading-relaxed">
          No preset selected. Browse presets to lock palette and character continuity.
        </p>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 h-8 rounded-lg border border-gold-500/35 bg-gold-500/10 text-[10px] tracking-[0.18em] uppercase text-gold-100 hover:bg-gold-500/15 transition"
        >
          <Wand2 className="w-3.5 h-3.5" />
          Choose style
        </button>
        {drawer}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-start justify-between gap-2', className)}>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-luxe/90 truncate">{template.name}</p>
          <p className="text-[10px] tracking-[0.14em] uppercase text-gold-300/55 mt-0.5">
            {template.category}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="shrink-0 h-7 px-2.5 rounded-md border border-white/[0.08] bg-white/[0.03] text-[9px] tracking-[0.16em] uppercase text-luxe/75 hover:text-gold-100 hover:border-gold-500/30 transition"
        >
          Change
        </button>
        {drawer}
      </div>
    )
  }

  const continuityOk = Boolean(
    storyBible?.visualStyle?.trim() || storyBible?.cameraLanguage?.trim()
  )
  const paletteOk = Boolean(
    storyBible?.colorPalette?.trim() || template.color_palette?.trim()
  )
  const characterMode =
    outputAlignmentControls?.characterConsistency ??
    (template.character_consistency.toLowerCase().includes('strict')
      ? 'strict'
      : template.character_consistency.toLowerCase().includes('loose')
        ? 'loose'
        : 'balanced')
  const characterLabel =
    characterMode === 'strict'
      ? 'Strict lock'
      : characterMode === 'loose'
        ? 'Loose'
        : 'Balanced'

  return (
    <div className={cn('rounded-xl border border-gold-500/20 bg-black/45 p-3 space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Wand2 className="w-3.5 h-3.5 text-gold-300/75" />
        <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/65">Current style</p>
      </div>

      <div>
        <p className="text-[13px] font-medium text-luxe/90 leading-snug">{template.name}</p>
        <p className="text-[10px] tracking-[0.16em] uppercase text-gold-300/55 mt-1">
          {template.category}
        </p>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
        <StatusRow
          label="Continuity"
          value={continuityOk ? 'Locked' : 'Applying…'}
          ok={continuityOk}
        />
        <StatusRow
          label="Palette"
          value={paletteOk ? 'Set' : 'Pending'}
          ok={paletteOk}
        />
        <StatusRow label="Character lock" value={characterLabel} ok={characterMode === 'strict'} />
      </div>

      <div className="flex items-center gap-2 text-[10px] text-luxe/40">
        {continuityOk ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-400/80" />
        ) : (
          <Circle className="w-3 h-3" />
        )}
        <Palette className="w-3 h-3" />
        <Users className="w-3 h-3" />
        <span className="italic">Preset metadata applied to story bible</span>
      </div>

      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="w-full h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[10px] tracking-[0.18em] uppercase text-luxe/75 hover:text-gold-100 hover:border-gold-500/30 transition"
      >
        Change style
      </button>

      {drawer}
    </div>
  )
}
