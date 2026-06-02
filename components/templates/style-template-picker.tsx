'use client'

import { LayoutTemplate } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TemplateGallery } from '@/components/templates/template-gallery'
import { getStyleTemplateById, type StyleTemplate } from '@/lib/templates/style-templates'
import { cn } from '@/lib/utils'

type StyleTemplatePickerProps = {
  selectedId?: string | null
  onSelect: (template: StyleTemplate) => void
  ideaForRecommend?: string
  className?: string
}

export function StyleTemplatePicker({
  selectedId,
  onSelect,
  ideaForRecommend = '',
  className,
}: StyleTemplatePickerProps) {
  const selected = getStyleTemplateById(selectedId)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-full text-[10px] tracking-[0.18em] uppercase',
            'border border-white/[0.08] text-luxe/70 hover:text-gold-200 hover:border-gold-500/30 transition',
            selected && 'border-gold-500/40 text-gold-200 bg-gold-500/10',
            className
          )}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          {selected ? selected.name : 'Style template'}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[min(90dvh,900px)] overflow-y-auto bg-[#0a0a0a] border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="font-display text-gold-gradient">Choose a style</DialogTitle>
        </DialogHeader>
        <TemplateGallery
          selectedId={selectedId}
          onSelect={onSelect}
          ideaForRecommend={ideaForRecommend}
        />
      </DialogContent>
    </Dialog>
  )
}
