import 'server-only'

import {
  OPENART_MCP_CLIENT_INFO,
  OPENART_MCP_PROTOCOL_VERSION,
  OPENART_MCP_SERVER_URL,
} from '@/lib/openart/constants.server'

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id?: number | string
  method: string
  params?: Record<string, unknown>
}

type JsonRpcResponse = {
  jsonrpc: '2.0'
  id?: number | string
  result?: unknown
  error?: { code?: number; message?: string; data?: unknown }
}

export type OpenArtMcpTool = {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export type OpenArtMcpCallResult = {
  content: Array<Record<string, unknown>>
  isError?: boolean
  structuredContent?: Record<string, unknown>
}

let requestCounter = 0

function nextRequestId(): number {
  requestCounter += 1
  return requestCounter
}

function parseSseJsonPayloads(raw: string): unknown[] {
  const payloads: unknown[] = []
  for (const block of raw.split('\n\n')) {
    const dataLine = block
      .split('\n')
      .find((line) => line.startsWith('data:'))
      ?.slice('data:'.length)
      .trim()
    if (!dataLine || dataLine === '[DONE]') continue
    try {
      payloads.push(JSON.parse(dataLine))
    } catch {
      // ignore malformed SSE chunks
    }
  }
  return payloads
}

async function postMcpMessage(params: {
  accessToken: string
  sessionId?: string
  message: JsonRpcRequest
}): Promise<{ body: unknown; sessionId?: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  }
  if (params.sessionId) headers['Mcp-Session-Id'] = params.sessionId

  const res = await fetch(OPENART_MCP_SERVER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(params.message),
    signal: AbortSignal.timeout(120_000),
  })

  const sessionId = res.headers.get('Mcp-Session-Id') ?? params.sessionId ?? undefined
  const contentType = res.headers.get('content-type') ?? ''

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      text.trim() || `OpenArt MCP request failed (${res.status}) for method ${params.message.method}`
    )
  }

  if (contentType.includes('text/event-stream')) {
    const raw = await res.text()
    const payloads = parseSseJsonPayloads(raw)
    const response = payloads.find(
      (entry): entry is JsonRpcResponse =>
        Boolean(entry && typeof entry === 'object' && 'jsonrpc' in entry)
    )
    if (!response) throw new Error(`OpenArt MCP returned no JSON-RPC payload for ${params.message.method}`)
    if (response.error) {
      throw new Error(response.error.message ?? `OpenArt MCP error (${response.error.code ?? 'unknown'})`)
    }
    return { body: response.result, sessionId }
  }

  const json = (await res.json().catch(() => null)) as JsonRpcResponse | null
  if (!json) throw new Error(`OpenArt MCP returned invalid JSON for ${params.message.method}`)
  if (json.error) {
    throw new Error(json.error.message ?? `OpenArt MCP error (${json.error.code ?? 'unknown'})`)
  }
  return { body: json.result, sessionId }
}

export class OpenArtMcpClient {
  private sessionId?: string

  constructor(private readonly accessToken: string) {}

  async initialize(): Promise<void> {
    const init = await postMcpMessage({
      accessToken: this.accessToken,
      message: {
        jsonrpc: '2.0',
        id: nextRequestId(),
        method: 'initialize',
        params: {
          protocolVersion: OPENART_MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: OPENART_MCP_CLIENT_INFO,
        },
      },
    })
    this.sessionId = init.sessionId

    await postMcpMessage({
      accessToken: this.accessToken,
      sessionId: this.sessionId,
      message: {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {},
      },
    })
  }

  async listTools(): Promise<OpenArtMcpTool[]> {
    const response = await postMcpMessage({
      accessToken: this.accessToken,
      sessionId: this.sessionId,
      message: {
        jsonrpc: '2.0',
        id: nextRequestId(),
        method: 'tools/list',
        params: {},
      },
    })

    const tools = (response.body as { tools?: OpenArtMcpTool[] } | undefined)?.tools
    return Array.isArray(tools) ? tools : []
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<OpenArtMcpCallResult> {
    const response = await postMcpMessage({
      accessToken: this.accessToken,
      sessionId: this.sessionId,
      message: {
        jsonrpc: '2.0',
        id: nextRequestId(),
        method: 'tools/call',
        params: { name, arguments: args },
      },
    })

    const result = (response.body ?? {}) as OpenArtMcpCallResult
    if (result.isError) {
      const message =
        result.content
          ?.map((item) => (typeof item.text === 'string' ? item.text : JSON.stringify(item)))
          .join('; ') || `OpenArt MCP tool ${name} failed`
      throw new Error(message)
    }
    return result
  }
}

export async function createOpenArtMcpClient(accessToken: string): Promise<OpenArtMcpClient> {
  const client = new OpenArtMcpClient(accessToken)
  await client.initialize()
  return client
}
