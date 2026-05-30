import type { ProjectLanguage } from '@/lib/cinematic/language-detection'

/** LLM provider that produced research (or mock fallback). */
export type DeepResearchProvider = 'openai' | 'anthropic' | 'gemini' | 'mock'

/** Known failure / fallback reasons from the engine. */
export type DeepResearchReason =
  | 'empty_topic'
  | 'missing_api_key'
  | `${string}_failed`
  | `${string}_empty`
  | string

/** Input to the deep-research engine and pipeline pre-script pass. */
export type DeepResearchInput = {
  topic: string
  language?: ProjectLanguage | string
  /** Reserved — live web search is not used; training-knowledge prompts only. */
  skipWebSearch?: boolean
}

/** @deprecated Alias — prefer {@link DeepResearchInput}. */
export type DeepResearchTopicInput = DeepResearchInput

export type TopicOverview = {
  beginnerExplanation: string
  expertExplanation: string
  oneSentenceSummary: string
  whyItMatters: string
}

export type HookAngle = {
  title: string
  hookLine: string
  curiosityGap: string
  audienceTrigger: string
}

export type TimelineEvent = {
  year: string
  event: string
  significance: string
}

export type RareFact = {
  fact: string
  sourceHint: string
  surpriseLevel: 'low' | 'medium' | 'high' | string
}

export type StoryCase = {
  title: string
  summary: string
  emotionalBeat: string
}

export type Controversy = {
  claim: string
  opposingView: string
  stakes: string
}

export type PsychologyInsights = {
  coreEmotions: string[]
  cognitiveBiases: string[]
  viewerMotivation: string
  fearDesireTriggers: string[]
}

export type Metaphor = {
  metaphor: string
  explains: string
}

export type FuturePrediction = {
  prediction: string
  timeframe: string
  implication: string
}

export type StoryboardIdea = {
  sceneTitle: string
  visualDescription: string
  cameraStyle: string
  lightingMood: string
  atmosphere: string
  emotionalPurpose: string
}

export type WritersGoldmine = {
  strongestHook: string
  strongestStoryAngle: string
  strongestConflict: string
  strongestReveal: string
  strongestEnding: string
}

export type RetentionPlan = {
  openingPattern: string
  rehookMoments: string[]
  payoffBeats: string[]
  dropOffRisks: string[]
}

export type FactValidation = {
  highConfidenceFacts: string[]
  needsVerification: string[]
  commonMistakes: string[]
}

export type FinalRecommendations = {
  top10Discoveries: string[]
  titleIdeas: string[]
  thumbnailIdeas: string[]
  bestDocumentaryAngle: string
  bestFacelessAngle: string
  recommendedStructure: string
}

/** Structured deep-research artifact — primary engine output. */
export type DeepResearchReport = {
  topic: string
  overview: TopicOverview
  hookAngles: HookAngle[]
  timeline: TimelineEvent[]
  rareFacts: RareFact[]
  shockingStories: StoryCase[]
  controversies: Controversy[]
  psychology: PsychologyInsights
  metaphors: Metaphor[]
  futureImplications: FuturePrediction[]
  storyboardIdeas: StoryboardIdea[]
  writersGoldmine: WritersGoldmine
  retentionEngineering: RetentionPlan
  factChecking: FactValidation
  finalSummary: FinalRecommendations
}

/** @deprecated Legacy markdown sections — derived when needed for older UI paths. */
export type DeepResearchSections = {
  coreExplanation: string[]
  rareFacts: string[]
  viralHooks: string[]
  historicalContext: string[]
  comparisonsMetaphors: string[]
  controversies?: string[]
  futurePredictions?: string[]
}

/** Keys of {@link DeepResearchSections} (required buckets). */
export type DeepResearchRequiredSectionKey =
  | 'coreExplanation'
  | 'rareFacts'
  | 'viralHooks'
  | 'historicalContext'
  | 'comparisonsMetaphors'

/** Keys of optional legacy section buckets. */
export type DeepResearchOptionalSectionKey = 'controversies' | 'futurePredictions'

export type DeepResearchSectionKey =
  | DeepResearchRequiredSectionKey
  | DeepResearchOptionalSectionKey

/** Full persisted research artifact (API, store, script pipeline). */
export type DeepResearchDocument = {
  topic: string
  language: ProjectLanguage
  report: DeepResearchReport
  /** Markdown serialization of {@link report} for legacy script context. */
  document: string
  sections: DeepResearchSections | null
  provider: DeepResearchProvider
  mock: boolean
  createdAt?: string
  reason?: DeepResearchReason
}

/** Engine output — structured report + metadata for downstream script generation. */
export type DeepResearchResult = {
  report: DeepResearchReport
  /** Markdown serialization for legacy {@link buildDeepResearchScriptContextSection} callers. */
  document: string
  sections: DeepResearchSections | null
  mock: boolean
  provider?: DeepResearchProvider
  reason?: DeepResearchReason
  topic?: string
  language?: ProjectLanguage
}

/** POST /api/ai/deep-research request body (topic aliases supported). */
export type DeepResearchApiRequestBody = {
  topic?: string
  prompt?: string
  title?: string
  language?: ProjectLanguage | string
}

/** POST /api/ai/deep-research success response. */
export type DeepResearchApiResponse = {
  topic: string
  language: ProjectLanguage
  report: DeepResearchReport
  mock: boolean
  provider?: DeepResearchProvider
  reason?: DeepResearchReason
}

/** POST /api/ai/deep-research error response. */
export type DeepResearchApiErrorResponse = {
  error: string
}

/** Provider + mock metadata shared across engine, API, and store. */
export type DeepResearchMockFlags = {
  mock: boolean
  provider?: DeepResearchProvider
  reason?: DeepResearchReason
}

/** Script-generation pipeline flags for research integration. */
export type DeepResearchPipelineOptions = {
  skipResearch?: boolean
  researchDocument?: string
  researchReport?: DeepResearchReport
}

/** Quick Cut generation store fields tied to deep research. */
export type DeepResearchStoreFields = {
  researchDocument: string | null
  researchMock: boolean
}

/** Props for the collapsible deep-research preview panel. */
export type DeepResearchPanelProps = {
  document: string | null | undefined
  mock?: boolean
  className?: string
}

/** Research fields returned by {@link runScriptGeneration} and POST /api/generate-script. */
export type ScriptGenerationResearchOutput = {
  researchDocument?: string
  researchMock?: boolean
}

/** Research-related fields accepted by POST /api/generate-script. */
export type GenerateScriptApiResearchFields = Pick<
  DeepResearchPipelineOptions,
  'skipResearch' | 'researchDocument'
>

/** Research fields on POST /api/generate-script success JSON. */
export type GenerateScriptApiResearchResponse = ScriptGenerationResearchOutput
