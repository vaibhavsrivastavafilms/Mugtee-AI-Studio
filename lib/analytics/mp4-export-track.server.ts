import 'server-only'

import type { AnalyticsMetadata } from '@/lib/analytics/events'
import { trackServerEvent } from '@/lib/analytics/track-server-event'
import {
  classifyMp4ExportError,
  Mp4ExportEvents,
  type Mp4ExportEventName,
  type Mp4ExportStage,
  type Mp4FailedPayload,
} from '@/lib/analytics/mp4-export-events'

export async function trackMp4ExportServer(input: {
  event: Mp4ExportEventName
  userId?: string | null
  page?: string | null
  metadata?: AnalyticsMetadata
}): Promise<void> {
  await trackServerEvent({
    event: input.event,
    userId: input.userId ?? null,
    page: input.page ?? null,
    metadata: input.metadata ?? {},
  })
}

export async function trackMp4FailedServer(params: {
  userId?: string | null
  projectId?: string | null
  stage: Mp4ExportStage
  err: unknown
  route?: string
  page?: string | null
}): Promise<void> {
  const classified = classifyMp4ExportError(params.err, params.stage)
  const metadata: Mp4FailedPayload = {
    projectId: params.projectId ?? null,
    stage: classified.stage,
    error_code: classified.error_code,
    message: classified.message,
    ...(params.route ? { route: params.route } : {}),
  }
  await trackMp4ExportServer({
    event: Mp4ExportEvents.MP4_FAILED,
    userId: params.userId,
    page: params.page,
    metadata,
  })
}
