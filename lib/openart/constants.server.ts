import 'server-only'

export const OPENART_MCP_SERVER_URL = 'https://mcp.openart.ai/mcp'
export const OPENART_MCP_PROVIDER = 'openart_mcp'
export const OPENART_OAUTH_SCOPE = 'full_access'

export const OPENART_OAUTH_RESOURCE_METADATA_URL =
  'https://mcp.openart.ai/.well-known/oauth-protected-resource/mcp'

export const OPENART_OAUTH_AUTHORIZATION_SERVER_URL = 'https://openart.ai'

export const OPENART_OAUTH_ENDPOINTS = {
  authorize: 'https://openart.ai/suite/api/auth/oauth/authorize',
  token: 'https://openart.ai/suite/api/auth/oauth/token',
  register: 'https://openart.ai/suite/api/auth/oauth/register',
  revoke: 'https://openart.ai/suite/api/auth/oauth/revoke',
} as const

export const OPENART_MCP_CLIENT_INFO = {
  name: 'mugtee-ai-studio',
  version: '1.0.0',
} as const

export const OPENART_MCP_PROTOCOL_VERSION = '2024-11-05'
