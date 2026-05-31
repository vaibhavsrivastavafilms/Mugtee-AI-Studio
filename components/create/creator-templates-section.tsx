'use client'

import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const CREATOR_TEMPLATE_CATEGORIES = [
  {
    name: 'YouTube',
    templates: [
      'Start a faceless history channel',
      'Create a 30-day YouTube growth plan',
      'Generate a documentary script',
    ],
  },
  {
    name: 'Instagram',
    templates: [
      'Create a viral carousel',
      'Generate an educational reel script',
      'Build an AI side hustle post',
    ],
  },
  {
    name: 'Storytelling',
    templates: [
      'Write an emotional father-son story',
      'Create a cinematic short film',
      'Generate a life lesson narrative',
    ],
  },
  {
    name: 'Creator Growth',
    templates: [
      'Build a personal brand content plan',
      'Generate 30 content ideas',
      'Create a creator growth roadmap',
    ],
  },
] as const

const triggerClassName =
  'h-9 text-xs bg-black/30 border-white/[0.08] text-luxe/85 hover:border-gold-500/25 focus:ring-gold-500/20'

function categorySelectId(name: string): string {
  return `creator-template-${name.toLowerCase().replace(/\s+/g, '-')}`
}

export function CreatorTemplatesSection({
  onSelectTemplate,
  selectedTemplate,
  className,
}: {
  onSelectTemplate: (prompt: string) => void
  selectedTemplate?: string | null
  className?: string
}) {
  return (
    <section className={cn('space-y-3', className)} aria-labelledby="creator-templates-heading">
      <div className="text-center px-1">
        <h2
          id="creator-templates-heading"
          className="text-[10px] tracking-[0.28em] uppercase text-gold-400/70"
        >
          Try One Of These
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-luxe/55 leading-relaxed">
          Start with a proven creator workflow.
        </p>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        role="group"
        aria-label="Creator template categories"
      >
        {CREATOR_TEMPLATE_CATEGORIES.map((category) => {
          const selectId = categorySelectId(category.name)
          const selectedInCategory = category.templates.find(
            (template) => template === selectedTemplate
          )

          return (
            <div key={category.name} className="space-y-1.5 min-w-0">
              <label
                htmlFor={selectId}
                className="text-[9px] tracking-[0.24em] uppercase text-luxe/45"
              >
                {category.name}
              </label>
              <Select
                value={selectedInCategory}
                onValueChange={(template) => onSelectTemplate(template)}
              >
                <SelectTrigger
                  id={selectId}
                  aria-label={`${category.name} template`}
                  className={cn(
                    triggerClassName,
                    selectedInCategory && 'border-gold-500/50 text-gold-200'
                  )}
                >
                  <SelectValue placeholder="Choose template" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/[0.08] text-luxe/90">
                  {category.templates.map((template) => (
                    <SelectItem
                      key={template}
                      value={template}
                      className="text-xs focus:bg-gold-500/10 focus:text-gold-200"
                    >
                      {template}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>
    </section>
  )
}
