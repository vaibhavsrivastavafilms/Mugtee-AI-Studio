import 'server-only'

import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

export type PersistedOpenArtOAuthClient = {
  client_id: string
  redirect_uri: string
  client_secret?: string
  registered_at: string
}

function resolveStoreFilePath(): string {
  const override = process.env.OPENART_OAUTH_CLIENT_STORE?.trim()
  if (override) return override
  return path.join(process.cwd(), '.data', 'openart-oauth-client.json')
}

export async function loadPersistedOpenArtOAuthClient(): Promise<PersistedOpenArtOAuthClient | null> {
  const storeFile = resolveStoreFilePath()
  try {
    const raw = await readFile(storeFile, 'utf8')
    const data = JSON.parse(raw) as PersistedOpenArtOAuthClient
    const clientId = data.client_id?.trim()
    const redirectUri = data.redirect_uri?.trim()
    if (!clientId || !redirectUri) return null
    return {
      client_id: clientId,
      redirect_uri: redirectUri,
      client_secret: data.client_secret?.trim() || undefined,
      registered_at: data.registered_at ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function persistOpenArtOAuthClient(record: PersistedOpenArtOAuthClient): Promise<void> {
  const storeFile = resolveStoreFilePath()
  await mkdir(path.dirname(storeFile), { recursive: true })
  await writeFile(storeFile, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
  console.info('[openart-oauth] client registration persisted', {
    storeFile,
    clientIdPrefix: record.client_id.slice(0, 8),
    redirectUri: record.redirect_uri,
  })
}
