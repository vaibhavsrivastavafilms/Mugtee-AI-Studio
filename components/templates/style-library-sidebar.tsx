'use client'

import { ChevronLeft, ChevronRight, Library } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { getStyleTemplateById } from '@/lib/templates/style-templates'
import { TemplateGallery } from '@/components/templates/template-gallery'
import type { StyleTemplate } from '@/lib/templates/style-templates'

type StyleLibrarySidebarProps = {
  className?: string
}

const EXPANDED_WIDTH = 'w-[280px]'
const COLLAPSED_WIDTH = 'w-11'

export function StyleLibrarySidebar({ className }: StyleLibrarySidebarProps) {
  const styleTemplateId = useQuickCutGenerationStore((s) => s.styleTemplateId)
  const applyStyleTemplate = useQuickCutGenerationStore((s) => s.applyStyleTemplate)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const collapsed = useStudioWorkspaceStore(
    (s) => s.panelPreferences.styleLibraryCollapsed
  )
  const setPanelPreferences = useStudioWorkspaceStore((s) => s.setPanelPreferences)

  const template = getStyleTemplateById(styleTemplateId)
  const showExpandedGallery = !styleTemplateId && !collapsed

  const handleSelect = (t: StyleTemplate) => {
    applyStyleTemplate(t.id)
    setPanelPreferences({ styleLibraryCollapsed: true })
  }

  const toggleCollapsed = () =>
    setPanelPreferences({ styleLibraryCollapsed: !collapsed })

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 min-h-0 sticky top-0 self-start max-h-full',
        'border-l border-white/[0.06] bg-black/30 backdrop-blur-xl transition-[width] duration-300',
        collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        className
      )}
      aria-label="Style Library"
    >
      <div
        className={cn(
          'flex items-center gap-2 border-b border-white/[0.06] shrink-0',
          collapsed ? 'justify-center px-1 py-3' : 'px-3 py-3'
        )}
      >
        {!collapsed ? (
          <div className="flex-1 min-w-0">
            <p className="text-[9px] tracking-[0.24em] uppercase text-gold-300/70 flex items-center gap-1.5">
              <Library className="w-3.5 h-3.5 shrink-0" />
              Style Library
            </p>
            {template ? (
              <p className="text-[10px] text-luxe/45 mt-0.5 truncate">{template.name}</p>
            ) : (
              <p className="text-[10px] text-luxe/45 mt-0.5">Pick a preset</p>
            )}
          </div>
        ) : (
          <Library className="w-4 h-4 text-gold-300/70" aria-hidden />
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="shrink-0 p-1.5 rounded-md border border-white/[0.06] text-luxe/50 hover:text-gold-200 hover:border-gold-500/25 transition"
          aria-label={collapsed ? 'Expand Style Library' : 'Collapse Style Library'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <ChevronLeft className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {showExpandedGallery && !collapsed ? (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxe p-3">
          <TemplateGallery
            variant="list"
            showSearch
            showRecommendations={!styleTemplateId}
            showHeader={false}
            selectedId={styleTemplateId}
            onSelect={handleSelect}
            ideaForRecommend={prompt}
          />
        </div>
      ) : collapsed ? (
        <div className="flex-1 flex flex-col items-center py-3 gap-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="text-[8px] tracking-[0.2em] uppercase text-luxe/40 [writing-mode:vertical-rl] rotate-180 hover:text-gold-200/80 transition"
          >
            Styles
          </button>
        </div>
      ) : (
        <div className="p-3 text-[11px] text-luxe/50 leading-relaxed">
          <p className="mb-2">Active: {template?.name}</p>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="text-[10px] tracking-[0.16em] uppercase text-gold-300/70 hover:text-gold-100"
          >
            Expand library
          </button>
        </div>
      )}
    </aside>
  )
}
