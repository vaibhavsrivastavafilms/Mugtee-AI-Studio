export type WorkflowCategory =
  | 'content_creation'
  | 'marketing'
  | 'research'
  | 'publishing'
  | 'restaurant'
  | 'agency'
  | 'filmmaking'
  | 'education'
  | 'healthcare'
  | 'business'
  | 'creator'

export type WorkflowRunStatus =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'needs_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type WorkflowStage = {
  id: string
  label: string
  agentId?: string
}

export type WorkflowIoField = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'project' | 'brand'
  required?: boolean
}

export type WorkflowTemplateRecord = {
  id: string
  slug: string
  category: WorkflowCategory
  title: string
  description: string
  icon: string
  estimated_runtime_sec: number
  inputs: WorkflowIoField[]
  outputs: WorkflowIoField[]
  stages: WorkflowStage[]
  agent_ids: string[]
  is_default: boolean
  is_public: boolean
  installed?: boolean
  workflow_id?: string | null
}

export type AutomationWorkflowRecord = {
  id: string
  user_id: string
  template_id: string | null
  project_id: string | null
  title: string
  slug: string
  category: WorkflowCategory
  description: string | null
  icon: string
  config: Record<string, unknown>
  enabled: boolean
  installed_at: string
  updated_at: string
}

export type WorkflowRunRecord = {
  id: string
  user_id: string
  workflow_id: string
  project_id: string | null
  status: WorkflowRunStatus
  progress: number
  current_stage: string | null
  runtime_ms: number | null
  credits_used: number
  models_used: string[]
  input: Record<string, unknown>
  output: Record<string, unknown>
  error: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  workflow?: Pick<AutomationWorkflowRecord, 'title' | 'slug' | 'icon' | 'category'>
}

export type WorkflowLogRecord = {
  id: string
  run_id: string
  level: 'debug' | 'info' | 'warn' | 'error'
  stage: string | null
  message: string
  payload: Record<string, unknown>
  created_at: string
}

export type BrandMemoryRecord = {
  id: string
  user_id: string
  brand_profile_id: string | null
  brand_name: string | null
  mission: string | null
  vision: string | null
  logo_url: string | null
  fonts: unknown[]
  colours: unknown[]
  audience: Record<string, unknown>
  products: unknown[]
  services: unknown[]
  competitors: unknown[]
  previous_campaigns: unknown[]
  brand_tone: string | null
  custom_prompts: unknown[]
  writing_style: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export type MugteeAgent = {
  id: string
  name: string
  role: string
  description: string
  capabilities: string[]
}

export const WORKFLOW_CATEGORY_LABELS: Record<WorkflowCategory, string> = {
  content_creation: 'Content Creation',
  marketing: 'Marketing',
  research: 'Research',
  publishing: 'Publishing',
  restaurant: 'Restaurant',
  agency: 'Agency',
  filmmaking: 'Filmmaking',
  education: 'Education',
  healthcare: 'Healthcare',
  business: 'Business',
  creator: 'Creator',
}
