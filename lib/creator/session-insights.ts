export type CreatorMilestone =
  | 'first_prompt_started'
  | 'generation_completed'
  | 'project_saved'
  | 'export_used'
  | 'regeneration_used'
  | 'storyboard_viewed'

type SessionInsights = {
  milestones: Partial<Record<CreatorMilestone, true>>
  events: Array<{ type: CreatorMilestone; at: string }>
  firstSuccessDismissed: boolean
  guidanceDismissed: Partial<Record<string, true>>
  updatedAt: string
}

const STORAGE_KEY = 'mugtee:creator:session:v1'
const MAX_EVENTS = 48

function emptySession(): SessionInsights {
  return {
    milestones: {},
    events: [],
    firstSuccessDismissed: false,
    guidanceDismissed: {},
    updatedAt: new Date().toISOString(),
  }
}

function readSession(): SessionInsights {
  if (typeof window === 'undefined') return emptySession()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptySession()
    return { ...emptySession(), ...JSON.parse(raw) }
  } catch {
    return emptySession()
  }
}

function writeSession(session: SessionInsights) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, updatedAt: new Date().toISOString() })
    )
  } catch {
    /* quota or private mode — ignore */
  }
}

export function trackCreatorMilestone(type: CreatorMilestone): void {
  const session = readSession()
  if (!session.milestones[type]) {
    session.milestones[type] = true
  }
  session.events = [
    { type, at: new Date().toISOString() },
    ...session.events,
  ].slice(0, MAX_EVENTS)
  writeSession(session)
}

export function hasCreatorMilestone(type: CreatorMilestone): boolean {
  return Boolean(readSession().milestones[type])
}

export function getCreatorSessionInsights(): SessionInsights {
  return readSession()
}

export function shouldShowFirstSuccess(): boolean {
  const session = readSession()
  return (
    Boolean(session.milestones.generation_completed) &&
    !session.firstSuccessDismissed
  )
}

export function dismissFirstSuccess(): void {
  const session = readSession()
  session.firstSuccessDismissed = true
  writeSession(session)
}

export function isGuidanceDismissed(step: string): boolean {
  return Boolean(readSession().guidanceDismissed[step])
}

export function dismissGuidance(step: string): void {
  const session = readSession()
  session.guidanceDismissed[step] = true
  writeSession(session)
}

export function isFirstTimeCreator(): boolean {
  const session = readSession()
  return !session.milestones.generation_completed
}
