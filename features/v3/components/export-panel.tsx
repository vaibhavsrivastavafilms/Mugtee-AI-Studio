'use client'



import { useState } from 'react'

import { Download, FileText, Loader2, Play } from 'lucide-react'

import { cn } from '@/lib/utils'



type V3ExportPanelProps = {

  projectId: string

  reelUrl: string | null

  exportStatus: string

  title: string

  className?: string

}



export function V3ExportPanel({

  projectId,

  reelUrl,

  exportStatus,

  title,

  className,

}: V3ExportPanelProps) {

  const [downloading, setDownloading] = useState(false)

  const [error, setError] = useState<string | null>(null)



  const isRendering = exportStatus === 'queued' || exportStatus === 'rendering'

  const isReady = Boolean(reelUrl) && exportStatus === 'completed'



  async function downloadMp4() {

    setDownloading(true)

    setError(null)

    try {

      const res = await fetch(`/api/v3/projects/${projectId}/download`)

      const data = (await res.json()) as { reelUrl?: string; error?: string }

      if (!res.ok || !data.reelUrl) {

        throw new Error(data.error ?? 'Download unavailable')

      }

      const anchor = document.createElement('a')

      anchor.href = data.reelUrl

      anchor.download = `${title.replace(/\s+/g, '-').toLowerCase() || 'mugtee-reel'}.mp4`

      anchor.rel = 'noopener'

      anchor.target = '_blank'

      anchor.click()

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Download failed')

    } finally {

      setDownloading(false)

    }

  }



  return (

    <section className={cn('rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-4 sm:p-5', className)}>

      <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Final export</p>



      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}



      {isRendering ? (

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[rgba(212,175,55,0.2)] bg-black/30 px-4 py-3 text-sm text-[#F4E7A8]">

          <Loader2 className="h-4 w-4 animate-spin" />

          Rendering your cinematic MP4…

        </div>

      ) : null}



      {isReady && reelUrl ? (

        <div className="mt-4 space-y-4">

          <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-black">

            <video src={reelUrl} controls playsInline className="aspect-[9/16] w-full max-h-[70vh] bg-black object-contain" />

          </div>

          <div className="flex flex-wrap gap-3">

            <button

              type="button"

              disabled={downloading}

              onClick={() => void downloadMp4()}

              className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#E6C76A] disabled:opacity-50"

            >

              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}

              Download MP4

            </button>

            <a

              href={reelUrl}

              target="_blank"

              rel="noopener noreferrer"

              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5"

            >

              <Play className="h-4 w-4" />

              Open preview

            </a>

            <a

              href={`/api/v3/projects/${projectId}/download?format=script`}

              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5"

            >

              <FileText className="h-4 w-4" />

              Download script

            </a>

          </div>

        </div>

      ) : null}



      {!isReady && !isRendering ? (

        <p className="mt-4 text-sm text-white/45">Export will appear here when rendering completes.</p>

      ) : null}

    </section>

  )

}


