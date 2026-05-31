'use client'

import { cn } from '@/lib/utils'
import {
  CONTENT_LANGUAGES,
} from '@/lib/cinematic/content-languages'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const triggerClassName =
  'h-9 text-xs bg-black/30 border-white/[0.08] text-luxe/85 hover:border-gold-500/25 focus:ring-gold-500/20'

export function ContentLanguageSelector({
  value,
  onChange,
  className,
}: {
  value: ProjectLanguage
  onChange: (language: ProjectLanguage) => void
  className?: string
}) {
  const selected = CONTENT_LANGUAGES.find((option) => option.code === value)

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor="quick-cut-content-language"
        className="text-[9px] tracking-[0.24em] uppercase text-luxe/45"
      >
        Output language
      </label>
      <Select value={value} onValueChange={(code) => onChange(code as ProjectLanguage)}>
        <SelectTrigger
          id="quick-cut-content-language"
          aria-label="Output language"
          className={triggerClassName}
        >
          <SelectValue placeholder="Select language">
            {selected?.label ?? 'English'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-white/[0.08] text-luxe/90">
          {CONTENT_LANGUAGES.map((option) => (
            <SelectItem
              key={option.code}
              value={option.code}
              className="text-xs focus:bg-gold-500/10 focus:text-gold-200"
            >
              {option.native ? `${option.label} (${option.native})` : option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
