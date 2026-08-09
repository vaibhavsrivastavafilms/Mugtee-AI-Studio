import 'server-only'

export type OpenArtErrorCode =
  | 'OPENART_NOT_AUTHENTICATED'
  | 'OPENART_TOOL_DISCOVERY_FAILED'
  | 'OPENART_MODEL_UNAVAILABLE'
  | 'OPENART_GENERATION_FAILED'
  | 'OPENART_UPLOAD_FAILED'

export class OpenArtMcpError extends Error {
  readonly code: OpenArtErrorCode
  readonly details?: Record<string, unknown>

  constructor(code: OpenArtErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'OpenArtMcpError'
    this.code = code
    this.details = details
  }

  toJSON(): { error: OpenArtErrorCode; message: string } & Record<string, unknown> {
    return {
      error: this.code,
      message: this.message,
      ...(this.details ?? {}),
    }
  }
}

export function isOpenArtMcpError(err: unknown): err is OpenArtMcpError {
  return err instanceof OpenArtMcpError
}

export function classifyOpenArtMcpFailure(err: unknown): OpenArtMcpError {
  if (err instanceof OpenArtMcpError) return err

  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()

  if (/not connected|not authenticated|401|403|unauthorized|oauth|sign in/i.test(lower)) {
    return new OpenArtMcpError('OPENART_NOT_AUTHENTICATED', message)
  }
  if (/no video generation tool|no image generation tool|no image-to-video|tool discovery|no tools discovered|no mcp tools/i.test(lower)) {
    return new OpenArtMcpError('OPENART_TOOL_DISCOVERY_FAILED', message)
  }
  if (/model unavailable|no entitled|no available.*model/i.test(lower)) {
    return new OpenArtMcpError('OPENART_MODEL_UNAVAILABLE', message)
  }
  if (/upload|storage|persist|checkpoint/i.test(lower)) {
    return new OpenArtMcpError('OPENART_UPLOAD_FAILED', message)
  }

  return new OpenArtMcpError('OPENART_GENERATION_FAILED', message)
}
