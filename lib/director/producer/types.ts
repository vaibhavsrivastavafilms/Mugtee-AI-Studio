export type ProducerScoreFactors = {
  storyStrength: number
  audienceFit: number
  emotionalImpact: number
  curiosity: number
  visualPotential: number
  retention: number
  shareability: number
  cinematicQuality: number
}

export type ProducerRecommendationItem = {
  id: string
  text: string
  category: 'strength' | 'risk' | 'opportunity' | 'suggestion'
}

export type ChallengeReframe = {
  id: string
  originalWeakness: string
  reframe: string
  rationale: string
}

export type ProducerRecommendations = {
  strengths: ProducerRecommendationItem[]
  risks: ProducerRecommendationItem[]
  opportunities: ProducerRecommendationItem[]
  suggestions: ProducerRecommendationItem[]
  challengeReframes: ChallengeReframe[]
}

export type ProducerMemory = {
  acceptedSuggestionIds: string[]
  rejectedSuggestionIds: string[]
}

export const EMPTY_PRODUCER_MEMORY: ProducerMemory = {
  acceptedSuggestionIds: [],
  rejectedSuggestionIds: [],
}

export type ProducerReport = {
  id: string
  projectId: string
  userId: string
  scores: ProducerScoreFactors
  storyReadinessScore: number
  productionReady: boolean
  readinessLabel: 'Production Ready' | 'Needs Refinement'
  recommendations: ProducerRecommendations
  producerMemory: ProducerMemory
  createdAt: string
  updatedAt: string
}

export type ProducerAnalysisInput = {
  idea: string
  storyDirection?: {
    title: string
    logline: string
    hook: string
    emotionalPromise: string
    audience: string
  } | null
  framework?: {
    label: string
    coreEmotion: string
    audienceDesire: string
    narrativeTension: string
    curiosityGap: string
    transformation: string
  } | null
  frameworkAnalysis?: {
    act1: string
    act2: string
    conflict: string
    escalation: string
    breakthrough: string
    resolution: string
  } | null
  directorTreatment?: {
    genre: string
    mood: string
    emotionalArc: string
    visualStyle: string
    cameraLanguage: string
    colorPalette: string
  } | null
  blueprint?: {
    title: string
    hook: string
    summary: string
    script?: string
  } | null
  creatorDna?: {
    niche?: string
    tone?: string
    platform?: string
    emotionalGoal?: string
  }
  directorMemoryPrompt?: string
  producerMemoryPrompt?: string
  virloMarketPrompt?: string
  isGenericIdea?: boolean
  genericSignals?: string[]
}

export type ProducerMarketOpportunity = {
  workingNow: string[]
  emerging: string[]
  oversaturated: string[]
  recommended: string[]
}
