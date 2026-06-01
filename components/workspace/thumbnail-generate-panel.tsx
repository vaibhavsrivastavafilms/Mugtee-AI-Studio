'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { Download, ImageIcon, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Props = {
  title?: string
  hook?: string
  script?: string
  thumbnailIdea?: string
  loading?: boolean
}

async function downloadImageAsJpg(url: string, filename: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not fetch image')
  const blob = await res.blob()

  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(bitmap, 0, 0)

  const jpgBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('JPG conversion failed'))),
      'image/jpeg',
      0.92
    )
  })

  const objectUrl = URL.createObjectURL(jpgBlob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.click()
  URL.revokeObjectURL(objectUrl)
}

export function ThumbnailGeneratePanel({
  title,
  hook,
  script,
  thumbnailIdea,
  loading,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const hasContext =
    Boolean(title?.trim()) ||
    Boolean(hook?.trim()) ||
    Boolean(script?.trim()) ||
    Boolean(thumbnailIdea?.trim())

  const generate = useCallback(async () => {
    if (!hasContext || busy || loading) return
    setBusy(true)
    try {
      const res = await fetch('/api/workspace/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, hook, script, thumbnailIdea }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Generation failed')
      setImageUrl(data.url as string)
      toast.success('Thumbnail generated')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not generate thumbnail')
    } finally {
      setBusy(false)
    }
  }, [busy, hasContext, hook, loading, script, thumbnailIdea, title])

  const downloadJpg = useCallback(async () => {
    if (!imageUrl || downloading) return
    setDownloading(true)
    try {
      const slug = (title || hook || 'mugtee-thumbnail')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48)
      await downloadImageAsJpg(imageUrl, `${slug || 'mugtee-thumbnail'}.jpg`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }, [downloading, hook, imageUrl, title])

  return (
    <div className="space-y-4">
      {thumbnailIdea ? (
        <p className="text-[12px] text-luxe/65 leading-relaxed rounded-xl border border-white/[0.06] bg-black/20 p-4">
          {thumbnailIdea}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={generate}
          disabled={!hasContext || busy || loading}
          className="h-9 gap-2 bg-gold-gradient text-black hover:opacity-90 shadow-gold-glow disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Generate thumbnail
        </Button>
        {imageUrl ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={downloadJpg}
            disabled={downloading}
            className="h-9 gap-2 border-gold-500/30 text-luxe hover:text-gold-200"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Download JPG
          </Button>
        ) : null}
      </div>

      {busy ? (
        <div className="rounded-xl border border-gold-500/20 bg-black/30 aspect-video max-w-md flex items-center justify-center shimmer-cinematic">
          <div className="text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-gold-400/80 mx-auto" />
            <p className="text-[11px] tracking-[0.18em] uppercase text-gold-300/70">
              Rendering HD still…
            </p>
          </div>
        </div>
      ) : imageUrl ? (
        <div className="rounded-xl border border-gold-500/25 bg-black/30 p-2 max-w-md">
          <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10">
            <Image
              src={imageUrl}
              alt="Generated thumbnail"
              fill
              sizes="(max-width: 768px) 100vw, 448px"
              className="object-cover"
              unoptimized
            />
          </div>
          <p className="text-[10px] tracking-[0.16em] uppercase text-luxe/40 mt-2 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> DALL-E 3 HD · 16:9
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-luxe/45 italic">
          Generate a scroll-stopping thumbnail from your title, hook, and script context.
        </p>
      )}
    </div>
  )
}
