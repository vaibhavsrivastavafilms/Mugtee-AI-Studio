'use client'

import Image from 'next/image'
import { Loader2, MoreVertical, Pencil, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import { sceneDisplayTag } from '@/lib/studio/scene-display-tags'
import { studioBtnGhost } from '@/lib/studio/studio-design-tokens'

type StudioSceneCardProps = {
  scene: GeneratedScene
  index: number
  total: number
  selected?: boolean
  loading?: boolean
  onSelect?: () => void
  onEdit?: () => void
  onRegenerate?: () => void
}

export function StudioSceneCard({
  scene,
  index,
  total,
  selected,
  loading,
  onSelect,
  onEdit,
  onRegenerate,
}: StudioSceneCardProps) {
  const previewUrl =
    scene.imageUrl?.trim() ||
    scene.variationImageUrl?.trim() ||
    (!loading ? resolveScenePreviewUrl(scene, index) : null)
  const tag = sceneDisplayTag(index + 1, total)
  const duration = scene.duration ?? 4

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect?.()
      }}
      className={cn(
        'flex gap-3 p-3 rounded-xl border bg-[#141418]/80 transition cursor-pointer',
        selected
          ? 'border-studio-primary ring-1 ring-studio-primary/40 shadow-[0_0_24px_-8px_rgba(99,102,241,0.35)]'
          : 'border-white/[0.06] hover:border-white/[0.1]'
      )}
    >
      <div className="relative w-[88px] h-[72px] shrink-0 rounded-lg overflow-hidden bg-black/50">
        {loading && !previewUrl ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-studio-primary animate-spin" />
          </div>
        ) : previewUrl ? (
          <Image
            src={previewUrl}
            alt={scene.title || `Scene ${index + 1}`}
            fill
            sizes="88px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-white/[0.03]" />
        )}
        <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/75 text-[9px] tabular-nums text-luxe/80">
          {duration}s
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] tracking-[0.14em] uppercase text-luxe/40">
          {String(index + 1).padStart(2, '0')}
        </p>
        <h3 className="text-[13px] font-semibold text-luxe leading-snug line-clamp-1">
          {scene.title || `Scene ${index + 1}`}
        </h3>
        {scene.description ? (
          <p className="text-[11px] text-luxe/50 leading-relaxed line-clamp-2 mt-0.5">
            {scene.description}
          </p>
        ) : null}
        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-white/[0.06] text-[9px] tracking-[0.12em] uppercase text-luxe/55">
          {tag}
        </span>
      </div>

      <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onEdit} className={studioBtnGhost} aria-label="Edit scene">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={loading}
          className={studioBtnGhost}
          aria-label="Regenerate scene"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </button>
        <button type="button" className={studioBtnGhost} aria-label="More options">
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  )
}
