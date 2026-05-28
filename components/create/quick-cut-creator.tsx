'use client'

import { QuickCutPreview } from '@/components/quick-cut/quick-cut-preview'

/** Quick Cut flow — reuses preview session + QuickCutHome without duplicating pipeline. */
export function QuickCutCreator() {
  return <QuickCutPreview />
}
