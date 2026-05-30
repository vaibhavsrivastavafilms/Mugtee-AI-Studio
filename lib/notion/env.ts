/** Server-only Notion integration config (content calendar sync). */
export type NotionPropertyNames = {
  title: string
  platform: string
  status: string
  scheduled: string
  description: string
  mugteeId: string
}

export function getNotionConfig(): {
  apiKey: string | undefined
  databaseId: string | undefined
  configured: boolean
  properties: NotionPropertyNames
} {
  const apiKey = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN
  const databaseId = process.env.NOTION_CALENDAR_DATABASE_ID
  const properties: NotionPropertyNames = {
    title: process.env.NOTION_PROP_TITLE || 'Name',
    platform: process.env.NOTION_PROP_PLATFORM || 'Platform',
    status: process.env.NOTION_PROP_STATUS || 'Status',
    scheduled: process.env.NOTION_PROP_SCHEDULED || 'Scheduled',
    description: process.env.NOTION_PROP_DESCRIPTION || 'Description',
    mugteeId: process.env.NOTION_PROP_MUGTEE_ID || 'Mugtee ID',
  }
  return {
    apiKey,
    databaseId,
    configured: !!(apiKey && databaseId),
    properties,
  }
}
