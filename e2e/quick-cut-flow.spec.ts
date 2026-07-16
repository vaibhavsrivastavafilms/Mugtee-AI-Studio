import { test, expect } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('Quick Cut flow and CORS validation', () => {
  test('opens the quick-cut workspace and shows the generate flow', async ({ page }) => {
    await page.goto('/studio/quick')
    await expect(page.getByRole('heading', { name: /Idea → MP4/ })).toBeVisible()

    const promptField = page.getByPlaceholder('What reel should Mugtee produce for you?')
    await expect(promptField).toBeVisible()
    await promptField.fill('Create a short AI sample reel for testing.')

    const generateButton = page.getByRole('button', { name: /Generate Reel/ })
    await expect(generateButton).toBeEnabled()
    await generateButton.click()

    await expect(page.getByText(/to generate your reel/i)).toBeVisible()
  })

  test('returns CORS headers for API preflight requests', async ({ request }) => {
    const response = await request.fetch('/api/cinematic/quick-cut', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:4000',
        'access-control-request-method': 'POST',
      },
    })

    expect(response.status()).toBe(204)
    expect(response.headers()['access-control-allow-origin']).toBe('http://localhost:4000')
    expect(response.headers()['vary']).toContain('Origin')
    expect(response.headers()['access-control-allow-methods']).toContain('POST')
  })
})
