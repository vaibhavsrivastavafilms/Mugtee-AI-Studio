/** Server-only Buffer integration config (social post queue). */
export function getBufferConfig(): {
  accessToken: string | undefined
  defaultProfileId: string | undefined
  configured: boolean
} {
  const accessToken =
    process.env.BUFFER_ACCESS_TOKEN ||
    process.env.BUFFER_API_KEY ||
    process.env.BUFFER_TOKEN
  const defaultProfileId = process.env.BUFFER_PROFILE_ID
  return {
    accessToken,
    defaultProfileId,
    configured: !!accessToken,
  }
}
