/** Public beta launch mode — set NEXT_PUBLIC_PUBLIC_BETA=true (client) or PUBLIC_BETA=true (server). */
export function isPublicBetaEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_PUBLIC_BETA === 'true' ||
    process.env.PUBLIC_BETA === 'true'
  )
}
