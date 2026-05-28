'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Upload, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export type ImageReference = {
  file: File
  previewUrl: string
  note: string
}

function describeImage(file: File): string {
  const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
  return `Reference frame: ${name || file.name} — visual mood and composition guide`
}

export function ImageReferenceUploader({
  reference,
  onChange,
  className,
}: {
  reference: ImageReference | null
  onChange: (ref: ImageReference | null) => void
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const applyFile = useCallback(
    (file: File | null) => {
      if (!file || !file.type.startsWith('image/')) return
      if (reference?.previewUrl) URL.revokeObjectURL(reference.previewUrl)
      onChange({
        file,
        previewUrl: URL.createObjectURL(file),
        note: describeImage(file),
      })
    },
    [onChange, reference?.previewUrl]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
      if (item) {
        const file = item.getAsFile()
        if (file) applyFile(file)
      }
    },
    [applyFile]
  )

  const clear = () => {
    if (reference?.previewUrl) URL.revokeObjectURL(reference.previewUrl)
    onChange(null)
  }

  return (
    <div className={cn('space-y-3', className)} onPaste={handlePaste}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => applyFile(e.target.files?.[0] ?? null)}
      />

      <AnimatePresence mode="wait">
        {reference ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative group"
          >
            <div className="relative aspect-[16/10] max-h-[140px] w-full overflow-hidden rounded-xl border border-gold-500/30 bg-black/50 shadow-[0_0_32px_-8px_rgba(212,175,55,0.35)]">
              <Image
                src={reference.previewUrl}
                alt="Story reference"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <p className="absolute bottom-2 left-3 right-10 text-[10px] tracking-wide text-luxe/70 truncate">
                {reference.file.name}
              </p>
            </div>
            <button
              type="button"
              onClick={clear}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 border border-white/10 text-luxe/70 hover:text-luxe transition"
              aria-label="Remove reference image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              applyFile(e.dataTransfer.files[0] ?? null)
            }}
            className={cn(
              'rounded-xl border border-dashed px-4 py-3 transition-colors',
              dragOver
                ? 'border-gold-400/50 bg-gold-500/[0.08]'
                : 'border-white/[0.12] bg-white/[0.02]'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gold-500/25 bg-gold-500/[0.06]">
                <ImagePlus className="w-4 h-4 text-gold-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-luxe/70">Drop, paste, or upload a reference frame</p>
                <p className="text-[10px] text-luxe/40 mt-0.5">Influences visual mood in generation</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-black/30 px-3.5 text-[10px] tracking-[0.16em] uppercase text-luxe/75 hover:border-gold-500/35 hover:text-gold-200 transition"
        >
          <Upload className="w-3.5 h-3.5" /> Upload Frame
        </button>
        {reference ? (
          <span className="inline-flex min-h-[40px] items-center rounded-full border border-gold-500/30 bg-gold-500/[0.08] px-3.5 text-[10px] tracking-[0.16em] uppercase text-gold-200">
            Use As Story Reference
          </span>
        ) : null}
      </div>
    </div>
  )
}
