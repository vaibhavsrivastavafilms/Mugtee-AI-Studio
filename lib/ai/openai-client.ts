import OpenAI from 'openai'

let cached: OpenAI | null = null

/** Creates the OpenAI client on first use (never at module import). */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Configure it in the environment before calling OpenAI APIs.'
    )
  }
  if (!cached) {
    cached = new OpenAI({ apiKey })
  }
  return cached
}
