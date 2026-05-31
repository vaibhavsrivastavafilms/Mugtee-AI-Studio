/** Pollinations AI — keyless image generation via prompt URL. */
export function getPollinationsImageUrl(prompt: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 4000))}`
}
