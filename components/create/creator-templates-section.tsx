'use client'

import { cn } from '@/lib/utils'

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

export function CreatorTemplatesSection({
  onSelectTemplate,
  className,
}: {
  onSelectTemplate: (prompt: string) => void
  className?: string
}) {
  return (
    <section className={cn('space-y-4', className)} aria-labelledby="creator-templates-heading">
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

      <div className="space-y-4">
        {CREATOR_TEMPLATE_CATEGORIES.map((category) => (
          <div key={category.name} className="space-y-2">
            <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/60 px-0.5">
              {category.name}
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {category.templates.map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => onSelectTemplate(template)}
                  className={cn(
                    'inline-flex items-center px-3 py-1.5 rounded-full border text-[11px] sm:text-[11.5px] tracking-wide transition',
                    'bg-white/[0.025] border-white/[0.06] hover:bg-gold-500/10 hover:border-gold-500/40 text-luxe/80 hover:text-gold-200'
                  )}
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
