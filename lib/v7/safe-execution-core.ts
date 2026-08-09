/**
 * Safe Pollinations execution gate — pure logic (no network).
 */

export const V7_SAFE_EXECUTION_DEFAULT_MAX_POLLEN = 0.1

export type V7SafeExecutionCliArgs = {
  productionId: string
  sceneNumber: number
  maxPollen: number
  force: boolean
}

export type V7SafeExecutionState = {
  approvedScenes: Record<string, { approvedAt: string; approvedBy?: string }>
  generations: Record<
    string,
    {
      generatedAt: string
      imageUrl: string
      estimatedCostPollen: number
      model: string
      promptScore: number
    }
  >
}

export type PollenSpendBlockReason =
  | 'estimated_cost_exceeds_max_pollen'
  | 'estimated_cost_exceeds_available_balance'
  | 'balance_unavailable'

export function parseSafeExecutionCliArgs(argv: string[]): V7SafeExecutionCliArgs {
  const positional = argv.filter((arg) => !arg.startsWith('--'))
  const productionId = positional[0]?.trim()
  if (!productionId) {
    throw new Error('Usage: npm run v7:safe-generate -- <productionId> --scene <n> [--max-pollen 0.10] [--force]')
  }

  const sceneFlagIndex = argv.findIndex((arg) => arg === '--scene')
  const sceneRaw = sceneFlagIndex >= 0 ? argv[sceneFlagIndex + 1] : undefined
  const sceneNumber = Number(sceneRaw)
  if (!Number.isInteger(sceneNumber) || sceneNumber < 1) {
    throw new Error('--scene <number> is required (e.g. --scene 1)')
  }

  const maxPollenFlagIndex = argv.findIndex((arg) => arg === '--max-pollen')
  const maxPollenRaw = maxPollenFlagIndex >= 0 ? argv[maxPollenFlagIndex + 1] : undefined
  const maxPollen =
    maxPollenRaw != null && maxPollenRaw.trim()
      ? Number(maxPollenRaw)
      : V7_SAFE_EXECUTION_DEFAULT_MAX_POLLEN

  if (!Number.isFinite(maxPollen) || maxPollen <= 0) {
    throw new Error('--max-pollen must be a positive number')
  }

  return {
    productionId,
    sceneNumber,
    maxPollen,
    force: argv.includes('--force'),
  }
}

export function parseApproveSceneCliArgs(argv: string[]): Pick<V7SafeExecutionCliArgs, 'productionId' | 'sceneNumber'> {
  const parsed = parseSafeExecutionCliArgs([...argv, '--max-pollen', '0.10'])
  return { productionId: parsed.productionId, sceneNumber: parsed.sceneNumber }
}

export function readSafeExecutionState(
  timelineJson: Record<string, unknown> | null | undefined
): V7SafeExecutionState {
  const root = (timelineJson?.safeExecution as Partial<V7SafeExecutionState> | undefined) ?? {}
  return {
    approvedScenes: { ...(root.approvedScenes ?? {}) },
    generations: { ...(root.generations ?? {}) },
  }
}

export function mergeSafeExecutionState(
  timelineJson: Record<string, unknown> | null | undefined,
  patch: Partial<V7SafeExecutionState>
): Record<string, unknown> {
  const base = { ...(timelineJson ?? {}) }
  const current = readSafeExecutionState(base)
  return {
    ...base,
    safeExecution: {
      approvedScenes: { ...current.approvedScenes, ...(patch.approvedScenes ?? {}) },
      generations: { ...current.generations, ...(patch.generations ?? {}) },
    },
  }
}

export function isSceneApproved(state: V7SafeExecutionState, sceneNumber: number): boolean {
  return Boolean(state.approvedScenes[String(sceneNumber)]?.approvedAt)
}

export function assertPriorSceneApproved(state: V7SafeExecutionState, sceneNumber: number): void {
  if (sceneNumber <= 1) return
  const prior = sceneNumber - 1
  if (!isSceneApproved(state, prior)) {
    throw new Error(`AWAITING_PRIOR_SCENE_APPROVAL — approve scene ${prior} first`)
  }
}

export function checkPollenSpendAllowed(params: {
  estimatedCost: number
  maxPollen: number
  availableBalance: number | null
}):
  | { allowed: true }
  | {
      allowed: false
      code: 'POLLEN_SPEND_BLOCKED'
      estimatedCost: number
      maxPollen: number
      availableBalance: number | null
      reason: PollenSpendBlockReason
    } {
  const { estimatedCost, maxPollen, availableBalance } = params

  if (estimatedCost > maxPollen) {
    return {
      allowed: false,
      code: 'POLLEN_SPEND_BLOCKED',
      estimatedCost,
      maxPollen,
      availableBalance,
      reason: 'estimated_cost_exceeds_max_pollen',
    }
  }

  if (availableBalance == null) {
    return {
      allowed: false,
      code: 'POLLEN_SPEND_BLOCKED',
      estimatedCost,
      maxPollen,
      availableBalance,
      reason: 'balance_unavailable',
    }
  }

  if (estimatedCost > availableBalance) {
    return {
      allowed: false,
      code: 'POLLEN_SPEND_BLOCKED',
      estimatedCost,
      maxPollen,
      availableBalance,
      reason: 'estimated_cost_exceeds_available_balance',
    }
  }

  return { allowed: true }
}

export const V7_SCENE_STORY_REQUIREMENTS: Record<number, string[]> = {
  1: ['steak', 'cast iron', 'sizzling'],
  2: ['chef hand', 'herb powder', 'emulsion'],
  3: ['demi-glace', 'pouring', 'protein'],
  4: ['couple', 'glasses', 'dining room'],
  5: ['tweezers', 'micro-herb', 'plate'],
  6: ['sear', 'pour', 'dust', 'plate'],
  7: ['finished dish', 'steam'],
  8: ['graphic cta'],
}

export const V7_SCENE_8_FORBIDDEN_POSITIVE = [
  'chef',
  'people',
  'kitchen',
  'food photography',
  'restaurant interior',
]
