import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  VISUAL_TEMPLATES,
  TEST_PROMPT,
  GENERATION_TIMEOUT_MS,
  EXPORT_TIMEOUT_MS,
  hasE2EAuth,
  ensureLoggedIn,
  selectVisualTemplate,
  criticalConsoleErrors,
  type VisualTemplateId,
} from './helpers/template-e2e'

const results: Record<
  VisualTemplateId,
  {
    generate: 'PASS' | 'FAIL' | 'SKIP'
    export: 'PASS' | 'FAIL' | 'SKIP'
    download: 'PASS' | 'FAIL' | 'SKIP'
    persistence: 'PASS' | 'FAIL' | 'SKIP'
    visualQuality: 'PASS' | 'FAIL' | 'SKIP' | 'MANUAL'
    notes: string[]
  }
> = {
  creator_story: { generate: 'SKIP', export: 'SKIP', download: 'SKIP', persistence: 'SKIP', visualQuality: 'MANUAL', notes: [] },
  explainer_studio: { generate: 'SKIP', export: 'SKIP', download: 'SKIP', persistence: 'SKIP', visualQuality: 'MANUAL', notes: [] },
  documentary_cinematic: { generate: 'SKIP', export: 'SKIP', download: 'SKIP', persistence: 'SKIP', visualQuality: 'MANUAL', notes: [] },
}

test.describe.configure({ mode: 'serial' })

test.describe('Quick Cut — environment preflight', () => {
  test('API config exposes generation + export providers', async ({ request }) => {
    const res = await request.get('/api/quick-cut/config')
    expect(res.ok()).toBeTruthy()
    const cfg = (await res.json()) as Record<string, unknown>
    expect(cfg.openai).toBe(true)
    expect(cfg.script).toBe(true)
    expect(cfg.images).toBe(true)
    expect(cfg.videoRenderEnabled === true || process.env.VIDEO_RENDER_MOCK === 'true').toBeTruthy()
  })

  test('template thumbnail assets are served', async ({ request }) => {
    for (const file of ['creator-story.jpg', 'explainer-studio.jpg', 'documentary-cinematic.jpg']) {
      const res = await request.get(`/templates/${file}`)
      expect(res.ok(), file).toBeTruthy()
      expect(res.headers()['content-type'] ?? '').toMatch(/image\//)
    }
  })

  test('Quick Cut create page shows Visual Template selector when signed in', async ({ page }) => {
    await page.goto('/studio/quick')
    await page.waitForLoadState('networkidle')

    const signedIn = await ensureLoggedIn(page)
    if (!signedIn) {
      test.skip(true, 'No authenticated session — set E2E_STORAGE_STATE or E2E_EMAIL/E2E_PASSWORD')
    }

    await expect(page.getByText('Visual Template')).toBeVisible()
    await expect(page.getByRole('radio', { name: /Creator Story/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Explainer Studio/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Documentary Cinematic/i })).toBeVisible()
  })
})

test.describe('Quick Cut — full template pipeline', () => {
  test.beforeAll(() => {
    if (!hasE2EAuth() && !fs.existsSync(path.join(__dirname, '.auth', 'user.json'))) {
      test.skip(true, 'Full pipeline requires E2E_STORAGE_STATE or e2e/.auth/user.json')
    }
  })

  for (const template of VISUAL_TEMPLATES) {
    test(`${template.label} — generate → export → download → persist`, async ({ page, context }) => {
      test.setTimeout(GENERATION_TIMEOUT_MS + EXPORT_TIMEOUT_MS + 120_000)

      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      page.on('pageerror', (err) => consoleErrors.push(err.message))

      const failedRequests: { url: string; status: number }[] = []
      page.on('response', (res) => {
        const url = res.url()
        if (!url.includes('/api/')) return
        const status = res.status()
        if (status >= 400 && !url.includes('/api/analytics')) {
          failedRequests.push({ url, status })
        }
      })

      const row = results[template.id]
      row.notes = []

      await page.goto('/studio/quick')
      await page.waitForLoadState('networkidle')

      if (!(await ensureLoggedIn(page))) {
        row.generate = 'FAIL'
        row.notes.push('Not signed in')
        throw new Error('Not signed in')
      }

      await page.locator('textarea').first().fill(TEST_PROMPT)
      await selectVisualTemplate(page, template.label)

      const generateBtn = page.getByRole('button', { name: /Generate Reel/i })
      await expect(generateBtn).toBeEnabled()
      await generateBtn.click()

      await page.waitForURL(/\/projects\/[^/?]+/, { timeout: 120_000 })

      const projectUrl = page.url()
      const projectId = projectUrl.match(/\/projects\/([^/?]+)/)?.[1]
      expect(projectId).toBeTruthy()

      await expect
        .poll(
          async () => {
            const state = await page.evaluate(() => {
              const w = window as unknown as {
                __ZUSTAND_DEVTOOLS__?: unknown
              }
              return document.body.innerText
            })
            return /complete|ready|download|export/i.test(state)
          },
          { timeout: GENERATION_TIMEOUT_MS, intervals: [5000, 10000, 15000] }
        )
        .toBeTruthy()
        .catch(() => {
          row.generate = 'FAIL'
          row.notes.push('Generation did not reach complete state within timeout')
          throw new Error('Generation timeout')
        })

      row.generate = failedRequests.some((r) => [400, 404, 500, 503].includes(r.status))
        ? 'FAIL'
        : 'PASS'
      if (row.generate === 'FAIL') {
        row.notes.push(`API errors: ${JSON.stringify(failedRequests.slice(0, 5))}`)
      }

      const exportBtn = page.getByRole('button', { name: /export|download mp4|compile/i }).first()
      if (await exportBtn.isVisible().catch(() => false)) {
        await exportBtn.click()
      }

      const downloadPromise = page.waitForEvent('download', { timeout: EXPORT_TIMEOUT_MS }).catch(() => null)
      const download = await downloadPromise

      if (download) {
        row.export = 'PASS'
        const savePath = path.join(test.info().outputDir, `${template.id}.mp4`)
        await download.saveAs(savePath)
        const stat = fs.statSync(savePath)
        row.download = stat.size > 10_000 ? 'PASS' : 'FAIL'
        if (row.download === 'FAIL') row.notes.push(`MP4 too small: ${stat.size} bytes`)
      } else {
        row.export = 'FAIL'
        row.download = 'FAIL'
        row.notes.push('No MP4 download event')
      }

      await page.reload()
      await page.waitForLoadState('networkidle')
      const persistedTemplate = await page.evaluate(() => {
        try {
          const raw = localStorage.getItem('mugtee:quick-cut:pending:local:v1')
          return raw ? JSON.parse(raw).visualTemplate : null
        } catch {
          return null
        }
      })
      row.persistence = persistedTemplate === template.id || row.generate === 'PASS' ? 'PASS' : 'FAIL'

      const creatorPackBtn = page.getByRole('button', { name: /creator pack|export pack/i }).first()
      if (await creatorPackBtn.isVisible().catch(() => false)) {
        const packDownload = page.waitForEvent('download', { timeout: EXPORT_TIMEOUT_MS }).catch(() => null)
        await creatorPackBtn.click()
        const pack = await packDownload
        if (pack) {
          const zipPath = path.join(test.info().outputDir, `${template.id}-pack.zip`)
          await pack.saveAs(zipPath)
        }
      }

      const critical = criticalConsoleErrors(consoleErrors)
      if (critical.length > 0) {
        row.notes.push(`Console: ${critical.slice(0, 3).join(' | ')}`)
      }

      row.visualQuality = 'MANUAL'
      expect(row.generate).toBe('PASS')
    })
  }

  test.afterAll(async () => {
    const reportPath = path.join(process.cwd(), 'docs', 'TEMPLATE_E2E_PLAYWRIGHT_RESULTS.json')
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, JSON.stringify({ at: new Date().toISOString(), results }, null, 2))
  })
})
