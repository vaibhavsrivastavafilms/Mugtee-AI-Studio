'use client'
// Legacy re-export — prefer `@/components/director/rewrite-toolbar`.

export {
  RewriteToolbar,
  type RewriteVariant,
  type RewriteReplacePayload,
} from '@/components/director/rewrite-toolbar'

// Legacy variant subset still used by voice intents / follow-up actions
export type LegacyRewriteVariant =
  | 'more_viral'
  | 'shorter'
  | 'emotional'
  | 'documentary'
  | 'cta'
