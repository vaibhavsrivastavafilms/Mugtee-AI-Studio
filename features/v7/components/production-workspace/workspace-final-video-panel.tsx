'use client'

import { resolveReelDimensions } from '@/lib/remotion/reel-dimensions.core'
import { V7ProductionDownloadButton } from '@/features/v7/components/production-download-button'
import type { WorkspacePayload } from '@/lib/v7/workspace/workspace-view.core'

type WorkspaceFinalVideoPanelProps = {
  productionId: string
  workspace: WorkspacePayload
}

export function WorkspaceFinalVideoPanel({ productionId, workspace }: WorkspaceFinalVideoPanelProps) {
  const dims = resolveReelDimensions(workspace.brief?.aspectRatio ?? '9:16')
  const durationSec = workspace.brief?.duration ?? workspace.script.durationSec

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">Your video is ready</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Final video</h3>
        {workspace.renderStale ? (
          <p className="mt-2 text-sm text-amber-300">⚠ Based on previous script</p>
        ) : null}
      </div>

      {workspace.reelUrl ? (
        <video
          src={workspace.reelUrl}
          controls
          playsInline
          preload="metadata"
          poster={workspace.thumbnailUrl ?? undefined}
          className="mx-auto aspect-[9/16] max-h-[70dvh] w-full max-w-lg rounded-xl bg-black object-contain"
        />
      ) : (
        <p className="text-center text-sm text-white/50">Final video not ready.</p>
      )}

      <dl className="mx-auto grid max-w-lg gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
        {durationSec ? (
          <div>
            <dt className="text-[11px] uppercase tracking-[0.16em] text-white/40">Duration</dt>
            <dd className="mt-1 text-sm text-white/85">{durationSec}s</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[11px] uppercase tracking-[0.16em] text-white/40">Resolution</dt>
          <dd className="mt-1 text-sm text-white/85">
            {dims.width}×{dims.height}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.16em] text-white/40">FPS</dt>
          <dd className="mt-1 text-sm text-white/85">{dims.fps}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.16em] text-white/40">Video codec</dt>
          <dd className="mt-1 text-sm text-white/85">H.264</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.16em] text-white/40">Audio codec</dt>
          <dd className="mt-1 text-sm text-white/85">AAC</dd>
        </div>
      </dl>

      <div className="flex flex-wrap justify-center gap-2">
        <V7ProductionDownloadButton productionId={productionId} title={workspace.script.title ?? 'Production'} />
        {workspace.reelUrl ? (
          <a
            href={workspace.reelUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90"
          >
            Open fullscreen
          </a>
        ) : null}
        {workspace.creatorPackUrl ? (
          <a
            href={workspace.creatorPackUrl}
            download
            className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90"
          >
            Download creator pack
          </a>
        ) : null}
        {workspace.movUrl ? (
          <a href={workspace.movUrl} download className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white/90">
            Download MOV
          </a>
        ) : null}
      </div>
    </div>
  )
}
