function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const MOCK_EXPORT_STEPS = [
  'Packaging storyboard frames…',
  'Bundling script & captions…',
  'Finalizing export preview…',
] as const

/** Simulates export progress for Quick Cut MVP (no ffmpeg / render-video). */
export async function simulateMockExport(
  onProgress?: (label: string) => void
): Promise<void> {
  for (const label of MOCK_EXPORT_STEPS) {
    onProgress?.(label)
    await delay(550)
  }
}
