export * from '@/lib/virlo/types'
export { analyzePattern, analysisFromSeedPattern } from '@/lib/virlo/analyze-pattern'
export { aggregateMarketIntelligence } from '@/lib/virlo/market-intelligence'
export {
  buildHybridRecommendations,
  enrichFrameworkRecommendations,
  topHybridFramework,
} from '@/lib/virlo/hybrid-recommendation'
export { formatVirloMarketForPrompt } from '@/lib/virlo/virlo-prompt-injection'
export {
  loadViralPatterns,
  loadVirloMarketIntelligence,
  seedViralPatternsIfEmpty,
} from '@/lib/virlo/viral-patterns.server'
