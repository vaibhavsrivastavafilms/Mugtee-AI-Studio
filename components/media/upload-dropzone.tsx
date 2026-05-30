'use client'
import { useState, useCallback, useRef } from 'react'
import { Upload, X, FileVideo, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ACCEPTED_MIMES = ['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png']
const ACCEPTED_EXTS  = ['.mp4', '.mov', '.jpg', '.jpeg', '.png']
const MAX_SIZE_BYTES = 500 * 1024 * 1024 // 500 MB

type UploadStatus = 'pending' | 'uploading' | 'done' | 'error'
interface FileUpload {
  id: string
  file: File
  progress: number
  status: UploadStatus
  error?: string
}

function validate(file: File): string | null {
  if (file.size > MAX_SIZE_BYTES) return 'Too large (500 MB max)'
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()
  if (!ACCEPTED_MIMES.includes(file.type) && !ACCEPTED_EXTS.includes(ext)) {
    return 'Unsupported format. Use mp4, mov, jpg, or png.'
  }
  return null
}

export function UploadDropzone() {
  const { userId } = useStore()
  const [uploads, setUploads] = useState<FileUpload[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateOne = useCallback((id: string, patch: Partial<FileUpload>) => {
    setUploads(u => u.map(x => x.id === id ? { ...x, ...patch } : x))
  }, [])

  const startUpload = useCallback(async (upload: FileUpload) => {
    const { file } = upload
    updateOne(upload.id, { status: 'uploading' })

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      updateOne(upload.id, { status: 'error', error: 'Authentication not configured' })
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      updateOne(upload.id, { status: 'error', error: 'Not authenticated' })
      return
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${userId}/${Date.now()}_${safeName}`
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // POST raw file to Supabase Storage REST with XHR for progress events.
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${supabaseUrl}/storage/v1/object/media/${path}`)
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
      xhr.setRequestHeader('apikey', supabaseKey)
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      xhr.setRequestHeader('x-upsert', 'false')
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100)
          updateOne(upload.id, { progress: pct })
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve()
        try {
          const body = JSON.parse(xhr.responseText || '{}')
          reject(new Error(body.message || body.error || `HTTP ${xhr.status}`))
        } catch {
          reject(new Error(`HTTP ${xhr.status}`))
        }
      }
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.send(file)
    }).catch((e: any) => {
      updateOne(upload.id, { status: 'error', error: e.message || 'Upload failed' })
      throw e
    })

    // Public URL for preview.
    const { data: pub } = supabase.storage.from('media').getPublicUrl(path)
    const type: 'video' | 'image' = file.type.startsWith('video/') ? 'video' : 'image'

    // Insert metadata row into existing media table. Realtime subscription in the
    // store will pick it up automatically and refresh the gallery.
    const { error: insErr } = await supabase.from('media').insert({
      user_id: userId,
      title: file.name,
      type,
      url: pub.publicUrl,
      thumbnail: type === 'image' ? pub.publicUrl : null,
      size_bytes: file.size,
    })

    if (insErr) {
      updateOne(upload.id, { status: 'error', error: insErr.message })
      return
    }

    updateOne(upload.id, { status: 'done', progress: 100 })
    toast.success(`${file.name} uploaded`)
  }, [userId, updateOne])

  const handleFiles = useCallback((files: FileList | File[]) => {
    const items: FileUpload[] = []
    for (const file of Array.from(files)) {
      const err = validate(file)
      if (err) { toast.error(`${file.name}: ${err}`); continue }
      items.push({ id: 'u' + Math.random().toString(36).slice(2), file, progress: 0, status: 'pending' })
    }
    if (items.length === 0) return
    setUploads(u => [...items, ...u])
    items.forEach(item => startUpload(item))
  }, [startUpload])

  return (
    <div className="space-y-4">
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragOver={(e)  => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition',
          dragging ? 'border-gold-400 bg-gold-500/10' : 'border-white/10 hover:border-gold-500/40 hover:bg-white/[0.02]'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".mp4,.mov,.jpg,.jpeg,.png,video/mp4,video/quicktime,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="w-12 h-12 mx-auto rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold-glow mb-3">
          <Upload className="w-6 h-6 text-black" />
        </div>
        <h3 className="font-display text-xl mb-1">Drop files to upload</h3>
        <p className="text-luxe/70 text-sm">mp4 · mov · jpg · png · up to 500 MB each</p>
      </div>

      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="space-y-2 max-h-64 overflow-y-auto scrollbar-luxe pr-1"
          >
            {uploads.map(u => {
              const Icon = u.file.type.startsWith('video/') ? FileVideo : ImageIcon
              return (
                <motion.div key={u.id}
                  initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-8}}
                  className="glass rounded-xl p-3 flex items-center gap-3"
                >
                  <Icon className="w-5 h-5 text-gold-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium truncate">{u.file.name}</div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {(u.file.size / 1_000_000).toFixed(1)} MB
                      </span>
                    </div>
                    <div className="h-1.5 mt-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className={cn('h-full transition-all duration-200',
                          u.status === 'error' ? 'bg-red-500' :
                          u.status === 'done'  ? 'bg-emerald-400' :
                          'bg-gradient-to-r from-gold-500 to-gold-300'
                        )}
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      {u.status === 'error'  && <span className="text-red-300 truncate">{u.error}</span>}
                      {u.status === 'done'   && <span className="text-emerald-300">Uploaded</span>}
                      {u.status === 'uploading' && <span className="text-muted-foreground">{u.progress}%</span>}
                      {u.status === 'pending' && <span className="text-muted-foreground">Waiting…</span>}
                    </div>
                  </div>
                  {u.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  {u.status === 'done'  && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  <button
                    onClick={() => setUploads(prev => prev.filter(x => x.id !== u.id))}
                    className="p-1 hover:bg-white/5 rounded text-muted-foreground"
                    aria-label="dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
