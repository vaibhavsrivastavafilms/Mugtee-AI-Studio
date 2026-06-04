/** Gradual rollout for Hollywood AI Studio workflow in Director Mode. */
export function isDirectorStudioV2Enabled(): boolean {
  return process.env.NEXT_PUBLIC_DIRECTOR_STUDIO_V2 === 'true'
}
