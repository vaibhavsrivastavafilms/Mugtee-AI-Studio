'use client'

import Image from 'next/image'
import type { ShowcaseProject } from '@/lib/showcase/public-projects'
import { GalleryCard } from '@/components/v2/made-with-mugtee-static'

function PreviewLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.22em] uppercase text-[var(--v2-text-secondary)] mb-2">
      {children}
    </p>
  )
}

export function MadeWithMugteeCard({ project }: { project: ShowcaseProject }) {
  return (
    <GalleryCard badge={project.category} prompt={project.description || project.title}>
      <PreviewLabel>Hook</PreviewLabel>
      <p className="font-display text-lg italic text-[var(--v2-text-primary)] leading-snug line-clamp-4">
        &ldquo;{project.hookPreview}&rdquo;
      </p>
      {project.thumbnailUrl ? (
        <div className="mt-4">
          <PreviewLabel>Output preview</PreviewLabel>
          <div className="relative aspect-[9/16] max-h-48 w-full overflow-hidden rounded-lg border border-[var(--v2-border)] bg-black/40">
            <Image
              src={project.thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
              unoptimized
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
              <p className="text-[10px] tracking-[0.16em] uppercase text-[var(--v2-gold)]/90 line-clamp-2">
                {project.hookPreview}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {project.title && project.description !== project.title ? (
        <p className="mt-4 text-sm text-[var(--v2-text-secondary)] leading-relaxed line-clamp-2">
          {project.title}
        </p>
      ) : null}
    </GalleryCard>
  )
}
