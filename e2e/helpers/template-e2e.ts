import type { Page } from '@playwright/test'

export const VISUAL_TEMPLATES = [
  { id: 'creator_story', label: 'Creator Story' },
  { id: 'explainer_studio', label: 'Explainer Studio' },
  { id: 'documentary_cinematic', label: 'Documentary Cinematic' },
] as const

export type VisualTemplateId = (typeof VISUAL_TEMPLATES)[number]['id']

export const TEST_PROMPT =
  'How I built my first AI product in 30 days — lessons on focus, shipping fast, and staying consistent as a solo creator.'

export const GENERATION_TIMEOUT_MS = 12 * 60_000
export const EXPORT_TIMEOUT_MS = 8 * 60_000

export function hasE2EAuth(): boolean {
  return Boolean(
    process.env.E2E_STORAGE_STATE?.trim() ||
      (process.env.E2E_EMAIL?.trim() && process.env.E2E_PASSWORD?.trim())
  )
}

export async function ensureLoggedIn(page: Page): Promise<boolean> {
  const res = await page.request.get('/api/profile')
  if (!res.ok()) return false
  const data = (await res.json().catch(() => null)) as { signed_in?: boolean } | null
  return data?.signed_in === true
}

export async function selectVisualTemplate(page: Page, label: string): Promise<void> {
  await page.getByRole('radio', { name: new RegExp(label, 'i') }).click()
}

export async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))
  return errors
}

export function criticalConsoleErrors(errors: string[]): string[] {
  const ignore = [
    /LayoutGroupContext\.mjs\.map/,
    /Failed to load resource.*\.map/,
    /favicon\.ico/,
  ]
  return errors.filter((e) => !ignore.some((re) => re.test(e)))
}
