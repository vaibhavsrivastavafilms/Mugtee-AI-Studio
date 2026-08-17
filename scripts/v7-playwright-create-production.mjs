/**
 * One-shot Playwright: create a single V7 production via Studio UI.
 * Requires e2e/.auth/user.json (from global-setup).
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const PROMPT =
  'Create a 15-second cinematic video explaining how Mugtee creates AI videos with just one prompt.'
const baseURL = process.env.E2E_BASE_URL?.trim() || 'https://mugtee.in'
const storageState = path.join(process.cwd(), 'e2e/.auth/user.json')

if (!fs.existsSync(storageState)) {
  console.error('[E2E] Missing e2e/.auth/user.json')
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ storageState })
const page = await context.newPage()

try {
  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  if (page.url().includes('/auth/login')) {
    throw new Error('Redirected to login — auth session invalid')
  }

  const textarea = page.locator('textarea').first()
  await textarea.click()
  await textarea.pressSequentially(PROMPT, { delay: 5 })
  await page.getByRole('button', { name: 'Create Film' }).waitFor({ state: 'visible', timeout: 15_000 })
  await page.getByRole('button', { name: 'Create Film' }).click()

  await page.waitForURL(/\/studio\/[0-9a-f-]{36}/, { timeout: 180_000 })
  const productionId = page.url().match(/\/studio\/([0-9a-f-]{36})/)?.[1]
  if (!productionId) throw new Error('Could not parse production ID from URL')

  console.log('[E2E] PRODUCTION_ID', productionId)

  const conceptHeading = page.getByRole('heading', { name: 'Choose your story' })
  try {
    await conceptHeading.waitFor({ timeout: 120_000 })
    await page.getByRole('button', { name: /Concept 1/i }).first().click()
    await page.getByRole('button', { name: 'Continue production' }).click()
    console.log('[E2E] CONCEPT_SELECTED', 0)
  } catch {
    console.log('[E2E] CONCEPT_SELECTION', 'not_required_or_timeout')
  }

  fs.writeFileSync(
    path.join(process.cwd(), 'scripts', 'v7-e2e-production-id.txt'),
    productionId,
    'utf8'
  )
} finally {
  await browser.close()
}
