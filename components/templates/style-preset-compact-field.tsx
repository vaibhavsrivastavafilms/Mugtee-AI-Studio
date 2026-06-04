'use client'

import { useState } from 'react'
import { LayoutTemplate } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStyleTemplateById } from '@/lib/templates/style-templates'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { StyleLibraryDrawer } from '@/components/templates/style-library-drawer'

type StylePresetCompactFieldProps = {
  className?: string
}

export function StylePresetCompactField({ className }: StylePresetCompactFieldProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const styleTemplateId = useQuickCutGenerationStore((s) => s.styleTemplateId)
  const applyStyleTemplate = useQuickCutGenerationStore((s) => s.applyStyleTemplate)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const template = getStyleTemplateById(styleTemplateId)

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-white/[0.06] bg-black/35 px-3 py-2.5',
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <LayoutTemplate className="w-3.5 h-3.5 text-gold-300/70 shrink-0" />
        <div className="min-w-0">
          <p className="text-[9px] tracking-[0.2em] uppercase text-violet-300/60">Creative System</p>
          <p className="text-xs text-luxe/80 truncate">
            {template ? `${template.name} · ${template.category}` : 'Optional — lock look & continuity before generate'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="shrink-0 h-8 px-3 rounded-lg border border-violet-500/30 text-[10px] tracking-[0.16em] uppercase text-violet-100/90 hover:bg-violet-500/10 transition"
      >
        {template ? 'Change System' : 'Browse Systems'}
      </button>
      <StyleLibraryDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        selectedId={styleTemplateId}
        ideaForRecommend={prompt}
        onSelect={(t) => {
          applyStyleTemplate(t.id)
          setDrawerOpen(false)
        }}
      />
    </div>
  )
}
