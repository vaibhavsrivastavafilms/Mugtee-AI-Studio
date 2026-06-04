'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TemplateGallery } from '@/components/templates/template-gallery'
import type { StyleTemplate } from '@/lib/templates/style-templates'

type StyleLibraryDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedId?: string | null
  onSelect: (template: StyleTemplate) => void
  ideaForRecommend?: string
}

export function StyleLibraryDrawer({
  open,
  onOpenChange,
  selectedId,
  onSelect,
  ideaForRecommend = '',
}: StyleLibraryDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed inset-y-0 right-0 left-auto top-0 h-[100dvh] max-h-[100dvh] w-full sm:max-w-md translate-x-0 translate-y-0 rounded-none border-l border-white/[0.08] bg-[#070707]/98 backdrop-blur-2xl p-0 flex flex-col gap-0 data-[state=open]:slide-in-from-right"
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/[0.06] text-left shrink-0 space-y-1">
          <DialogTitle className="font-display text-base text-gold-gradient tracking-wide">
            Style Library
          </DialogTitle>
          <DialogDescription className="text-[11px] text-luxe/50 leading-relaxed">
            Search presets, filter by category, and apply continuity locks to your film.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxe px-4 py-4">
          <TemplateGallery
            variant="list"
            showSearch
            showRecommendations
            showHeader={false}
            selectedId={selectedId}
            onSelect={onSelect}
            ideaForRecommend={ideaForRecommend}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
