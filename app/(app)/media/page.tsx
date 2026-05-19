'use client'
import { motion } from 'framer-motion'
import { Play, FileVideo, Image as ImgIcon, Music, Plus, Trash2, ImagePlus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton, EmptyState } from '@/components/ui/state'
import { useState } from 'react'
import type { MediaType } from '@/lib/types'

const ICONS: any = { video: FileVideo, image: ImgIcon, audio: Music }

function formatBytes(n?: number | null) {
  if (!n) return ''
  if (n > 1e9) return (n / 1e9).toFixed(1) + ' GB'
  if (n > 1e6) return (n / 1e6).toFixed(1) + ' MB'
  if (n > 1e3) return (n / 1e3).toFixed(1) + ' KB'
  return n + ' B'
}

export default function MediaPage() {
  const { media, loading, addMedia, removeMedia } = useStore()
  const [creating, setCreating] = useState(false)

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Media Library</div>
          <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">Frames</span> & assets</h1>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button className="bg-gold-gradient text-black gap-2 shadow-gold-glow"><Plus className="w-4 h-4" /> Add asset</Button>
          </DialogTrigger>
          <MediaDialog onSubmit={async (d)=>{ await addMedia(d); setCreating(false) }} />
        </Dialog>
      </motion.div>

      {loading.media ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{[0,1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="aspect-video" />)}</div>
      ) : media.length === 0 ? (
        <EmptyState icon={ImagePlus} title="No assets yet" description="Drop in your first thumbnail, B-roll clip, or audio asset." action={<Button className="bg-gold-gradient text-black" onClick={()=>setCreating(true)}><Plus className="w-4 h-4 mr-1" /> Add asset</Button>} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((m, i) => {
            const Icon = ICONS[m.type || 'image']
            return (
              <motion.div key={m.id}
                initial={{opacity:0, scale:0.96}} animate={{opacity:1, scale:1}} transition={{delay:Math.min(i*0.04, 0.4)}}
                whileHover={{y:-3}}
                className="group glass rounded-2xl overflow-hidden hover:shadow-cinema relative"
              >
                <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden">
                  {m.thumbnail ? (
                    <img src={m.thumbnail} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Icon className="w-10 h-10 text-gold-500/50" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  {m.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold-glow opacity-0 group-hover:opacity-100 transition">
                        <Play className="w-5 h-5 text-black ml-0.5" />
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[10px] tracking-wider uppercase flex items-center gap-1">
                    <Icon className="w-3 h-3 text-gold-300" /> {m.type}
                  </div>
                  <button onClick={() => removeMedia(m.id)} className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 backdrop-blur opacity-0 group-hover:opacity-100 hover:bg-red-500/60 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-3">
                  <div className="text-xs font-medium truncate">{m.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{formatBytes(m.size_bytes)}</div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MediaDialog({ onSubmit }: { onSubmit: (d: { title: string; type: MediaType; url: string; thumbnail: string; size_bytes: number }) => void | Promise<void> }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<MediaType>('image')
  const [url, setUrl] = useState('')
  const [thumb, setThumb] = useState('')
  return (
    <DialogContent className="glass-strong sm:max-w-md">
      <DialogHeader><DialogTitle className="font-display text-2xl">Add asset</DialogTitle></DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Title</label>
          <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="pasta_carbonara_v1.mp4" className="bg-white/[0.03]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Type</label>
          <Select value={type} onValueChange={(v)=>setType(v as MediaType)}>
            <SelectTrigger className="bg-white/[0.03]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">URL</label>
          <Input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…" className="bg-white/[0.03]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Thumbnail URL</label>
          <Input value={thumb} onChange={e=>setThumb(e.target.value)} placeholder="https://…" className="bg-white/[0.03]" />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit({ title: title || 'untitled', type, url, thumbnail: thumb, size_bytes: 0 })} className="bg-gold-gradient text-black">Save</Button>
      </DialogFooter>
    </DialogContent>
  )
}
