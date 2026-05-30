/**
 * Backward-compatible entry point for YouTube deep research.
 * Implementation lives in {@link ./deep-research-engine.ts}.
 */
export {
  parseDeepResearchSections,
  runDeepResearch,
  runDeepResearch as runYoutubeDeepResearch,
  toDeepResearchDocument,
} from '@/lib/cinematic/deep-research-engine'

export {
  buildDeepResearchReportScriptContext,
  buildDeepResearchSopPrompt,
  buildMockDeepResearchReport,
  normalizeDeepResearchReport,
  serializeDeepResearchReport,
} from '@/lib/ai/prompts/youtube/deep-research-sop'

export { buildVirloResearchScriptContext } from '@/lib/cinematic/virlo-script-engine'

export type {
  DeepResearchDocument,
  DeepResearchInput,
  DeepResearchProvider,
  DeepResearchReport,
  DeepResearchResult,
  DeepResearchSections,
  DeepResearchTopicInput,
} from '@/types/deep-research'
