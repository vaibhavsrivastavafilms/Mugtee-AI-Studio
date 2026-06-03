export type ParsedCommand = {
  raw: string
  text: string
  slash?: string
  isAssetSearch: boolean
  assetQuery?: string
}

const ASSET_PREFIX = /^\/assets?\s/i
const FIND_ASSETS = /^find\s+(all\s+)?assets?\b/i

/** Normalize user input from Cmd+K, chat, or voice transcript. */
export function parseUserCommand(input: string): ParsedCommand {
  const raw = input.trim()
  const slashMatch = raw.match(/^\/(\w+)(?:\s+(.*))?$/s)
  const slash = slashMatch?.[1]?.toLowerCase()
  const text = slashMatch?.[2]?.trim() || (slash ? '' : raw)

  let isAssetSearch = ASSET_PREFIX.test(raw) || FIND_ASSETS.test(raw)
  let assetQuery: string | undefined
  if (isAssetSearch) {
    assetQuery =
      raw.replace(ASSET_PREFIX, '').replace(/^find\s+(all\s+)?assets?\s*/i, '').trim() || raw
  }

  return {
    raw,
    text: text || raw,
    slash,
    isAssetSearch,
    assetQuery,
  }
}
