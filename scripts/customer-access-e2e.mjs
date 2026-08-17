/**
 * Customer access + media delivery verification (headed browser).
 *
 * Usage:
 *   E2E_BASE_URL=https://mugtee.in node scripts/customer-access-e2e.mjs
 *   E2E_BASE_URL=http://localhost:3000 E2E_PRODUCTION_ID=<uuid> node scripts/customer-access-e2e.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { spawnSync } from 'node:child_process'

const baseURL = process.env.E2E_BASE_URL?.trim() || 'http://localhost:3000'
const productionId =
  process.env.E2E_PRODUCTION_ID?.trim() || '3d51dc1f-0b60-475d-a75f-2905d2805688'
const storageState = path.join(process.cwd(), 'e2e/.auth/user.json')
const artifactDir = path.join(process.cwd(), 'scripts', 'customer-access-artifacts')

const report = {
  AUTH: 'FAIL',
  SIGN_UP: 'FAIL',
  SIGN_IN: 'FAIL',
  SESSION: 'NOT RUN',
  STUDIO_ACCESS: 'NOT RUN',
  PRODUCTION: 'NOT RUN',
  MEDIA_PREVIEW: 'NOT RUN',
  DOWNLOAD_BUTTON: 'NOT RUN',
  BROWSER_DOWNLOAD: 'NOT RUN',
  DOWNLOADED_MP4: 'NOT RUN',
  FFPROBE: 'NOT RUN',
  FINAL_CUSTOMER_FLOW: 'FAIL',
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function ffprobe(filePath) {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate',
      '-of',
      'json',
      filePath,
    ],
    { encoding: 'utf8' }
  )
  if (result.status !== 0) {
    throw new Error(result.stderr || 'ffprobe failed')
  }
  return JSON.parse(result.stdout)
}

async function screenshot(page, name) {
  ensureDir(artifactDir)
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true })
}

async function verifyAuthSurfaces(page) {
  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded' })
  await screenshot(page, 'studio-landing')

  const signInLink = page.getByRole('link', { name: /^Sign In$/i })
  const signUpLink = page.getByRole('link', { name: /^Sign Up$/i })
  report.AUTH = (await signInLink.count()) > 0 && (await signUpLink.count()) > 0 ? 'PASS' : 'FAIL'

  await page.goto(`${baseURL}/auth/login?next=%2Fstudio`, { waitUntil: 'domcontentloaded' })
  await screenshot(page, 'auth-login')

  const googleSignIn = page.getByRole('button', { name: /Sign in with Google/i })
  const needAccount = page.getByRole('button', { name: /Need an account\? Sign up/i })
  report.SIGN_IN = (await googleSignIn.count()) > 0 ? 'PASS' : 'FAIL'

  await page.goto(`${baseURL}/auth/signup?next=%2Fstudio`, { waitUntil: 'domcontentloaded' })
  await screenshot(page, 'auth-signup')

  const googleSignUp = page.getByRole('button', { name: /Sign up with Google/i })
  report.SIGN_UP = (await googleSignUp.count()) > 0 ? 'PASS' : 'FAIL'
}

async function verifyAuthenticatedFlow(page) {
  if (!fs.existsSync(storageState)) {
    console.warn('[customer-access] Missing e2e/.auth/user.json — skipping authenticated checks')
    return
  }

  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded' })
  report.STUDIO_ACCESS = page.url().includes('/auth/login') ? 'FAIL' : 'PASS'

  await page.goto(`${baseURL}/studio/${productionId}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.waitForTimeout(4000)
  await screenshot(page, 'production-page')

  const video = page.locator('video')
  const downloadButton = page.getByRole('button', { name: /^Download MP4$/i })
  report.MEDIA_PREVIEW = (await video.count()) > 0 ? 'PASS' : 'FAIL'
  report.DOWNLOAD_BUTTON = (await downloadButton.count()) > 0 ? 'PASS' : 'FAIL'

  if ((await downloadButton.count()) === 0) return

  ensureDir(artifactDir)
  const downloadPath = path.join(artifactDir, `${productionId}.mp4`)

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    downloadButton.click(),
  ])

  await download.saveAs(downloadPath)
  const stat = fs.statSync(downloadPath)
  report.BROWSER_DOWNLOAD = stat.size > 0 ? 'PASS' : 'FAIL'
  report.DOWNLOADED_MP4 = stat.size > 0 ? 'PASS' : 'FAIL'

  try {
    const probe = ffprobe(downloadPath)
    const hasVideo = probe.streams?.some((s) => s.codec_type === 'video')
    const hasAudio = probe.streams?.some((s) => s.codec_type === 'audio')
    const duration = Number.parseFloat(probe.format?.duration ?? '0')
    report.FFPROBE =
      hasVideo && hasAudio && Number.isFinite(duration) && duration > 0 ? 'PASS' : 'FAIL'
  } catch (error) {
    report.FFPROBE = 'FAIL'
    console.error('[customer-access] ffprobe failed', error)
  }
}

async function main() {
  ensureDir(artifactDir)
  const browser = await chromium.launch({ headless: false, slowMo: 50 })

  const anonymous = await browser.newContext()
  const anonPage = await anonymous.newPage()
  try {
    await verifyAuthSurfaces(anonPage)
  } finally {
    await anonymous.close()
  }

  const authedContext = await browser.newContext(
    fs.existsSync(storageState) ? { storageState } : undefined
  )
  const page = await authedContext.newPage()

  try {
    await verifyAuthenticatedFlow(page)

    if (fs.existsSync(storageState)) {
      await page.reload()
      report.SESSION = page.url().includes('/auth/login') ? 'FAIL' : 'PASS'
    }

    report.FINAL_CUSTOMER_FLOW =
      report.AUTH === 'PASS' &&
      report.SIGN_IN === 'PASS' &&
      report.SIGN_UP === 'PASS' &&
      (report.STUDIO_ACCESS === 'NOT RUN' || report.STUDIO_ACCESS === 'PASS') &&
      (report.MEDIA_PREVIEW === 'NOT RUN' || report.MEDIA_PREVIEW === 'PASS') &&
      (report.DOWNLOAD_BUTTON === 'NOT RUN' || report.DOWNLOAD_BUTTON === 'PASS') &&
      (report.BROWSER_DOWNLOAD === 'NOT RUN' || report.BROWSER_DOWNLOAD === 'PASS') &&
      (report.FFPROBE === 'NOT RUN' || report.FFPROBE === 'PASS')
        ? 'PASS'
        : 'FAIL'
  } finally {
    console.log(JSON.stringify(report, null, 2))
    await browser.close()
    process.exit(report.FINAL_CUSTOMER_FLOW === 'PASS' ? 0 : 1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
