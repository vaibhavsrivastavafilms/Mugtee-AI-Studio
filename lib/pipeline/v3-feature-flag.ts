/** Feature flag: MUGTEE_V3_PIPELINE=true enables multi-stage cinematic pipeline. */
export function isV3PipelineEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.MUGTEE_V3_PIPELINE?.trim().toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'yes'
}

/** Client-safe check — config API exposes v3PipelineEnabled. */
export function isV3PipelineEnabledFromConfig(
  config?: Record<string, unknown> | null
): boolean {
  if (config?.v3PipelineEnabled === true) return true
  return false
}
