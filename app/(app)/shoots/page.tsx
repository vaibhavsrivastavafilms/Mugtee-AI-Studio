'use client'
import { motion } from 'framer-motion'
import { Clapperboard, MapPin, Clock, Users, Plus, Trash2, Edit3, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton, EmptyState } from '@/components/ui/state'
import type { Shoot, ShootStatus } from '@/lib/types'
import { format, parseISO } from 'date-fns'

export default function ShootsPage() {
  const { shoots, loading, addShoot, updateShoot, removeShoot } = useStore()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Shoot | null>(null)

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Shoot Scheduling</div>
          <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">On</span> location</h1>
          <p className="text-luxe/70 mt-2">Production days, locations, and call sheets.</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button className="bg-gold-gradient text-black gap-2 shadow-gold-glow"><Plus className="w-4 h-4" /> Schedule shoot</Button>
          </DialogTrigger>
          <ShootDialog onSubmit={async (data) => { await addShoot(data); setCreating(false) }} />
        </Dialog>
      </motion.div>

      {loading.shoots ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[0,1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>
      ) : shoots.length === 0 ? (
        <EmptyState icon={Clapperboard} title="No shoots scheduled" description="Plan your first production day and start the call sheet." action={<Button className="bg-gold-gradient text-black" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> Schedule shoot</Button>} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {shoots.map((s, i) => {
            const d = s.date ? parseISO(s.date) : null
            return (
              <motion.div key={s.id}
                initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{delay:Math.min(i*0.06, 0.4)}}
                whileHover={{y:-3}}
                className="glass rounded-2xl p-5 hover:shadow-cinema"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gold-gradient flex items-center justify-center shrink-0 shadow-gold-glow">
                    <Clapperboard className="w-6 h-6 text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-xl truncate">{s.title}</h3>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full ${s.status==='today' ? 'bg-gold-500/20 text-gold-300' : s.status==='wrapped' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-500/15 text-zinc-400'}`}>{s.status || 'planned'}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-lg hover:bg-white/5"><MoreHorizontal className="w-4 h-4" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-strong">
                            <DropdownMenuItem onClick={() => setEditing(s)}><Edit3 className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => removeShoot(s.id)} className="text-red-300"><Trash2 className="w-3.5 h-3.5 mr-2" />Cancel</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                      {d && <div className="flex items-center gap-2 text-luxe/80"><Clock className="w-3.5 h-3.5 text-gold-400" />{format(d, 'EEE, MMM d, yyyy')}</div>}
                      {(s.start_time || s.end_time) && <div className="flex items-center gap-2 text-luxe/80"><Clock className="w-3.5 h-3.5 text-gold-400" />{[s.start_time, s.end_time].filter(Boolean).join(' – ')}</div>}
                      {s.location && <div className="flex items-center gap-2 text-luxe/80 col-span-full"><MapPin className="w-3.5 h-3.5 text-gold-400" />{s.location}</div>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <ShootDialog initial={editing} onSubmit={async (data) => { await updateShoot(editing.id, data); setEditing(null) }} />
        )}
      </Dialog>
    </div>
  )
}

function ShootDialog({ initial, onSubmit }: { initial?: Shoot; onSubmit: (data: Partial<Shoot>) => void | Promise<void> }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [date, setDate] = useState(initial?.date || format(new Date(), 'yyyy-MM-dd'))
  const [start, setStart] = useState(initial?.start_time || '09:00')
  const [end, setEnd] = useState(initial?.end_time || '17:00')
  const [loc, setLoc] = useState(initial?.location || '')
  const [status, setStatus] = useState<ShootStatus>((initial?.status as ShootStatus) || 'planned')

  return (
    <DialogContent className="glass-strong sm:max-w-lg">
      <DialogHeader><DialogTitle className="font-display text-2xl">{initial ? 'Edit shoot' : 'New shoot'}</DialogTitle></DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Title</label>
          <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Midnight Pasta · Rome" className="bg-white/[0.03]" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs tracking-wider uppercase text-muted-foreground">Date</label>
            <Input type="date" value={date} onChange={e=>setDate(e.target.value)} className="bg-white/[0.03]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs tracking-wider uppercase text-muted-foreground">Start</label>
            <Input type="time" value={start} onChange={e=>setStart(e.target.value)} className="bg-white/[0.03]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs tracking-wider uppercase text-muted-foreground">End</label>
            <Input type="time" value={end} onChange={e=>setEnd(e.target.value)} className="bg-white/[0.03]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Location</label>
          <Input value={loc} onChange={e=>setLoc(e.target.value)} placeholder="Trastevere, Rome" className="bg-white/[0.03]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Status</label>
          <Select value={status} onValueChange={(v)=>setStatus(v as ShootStatus)}>
            <SelectTrigger className="bg-white/[0.03]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="wrapped">Wrapped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit({ title: title || 'Untitled shoot', date, start_time: start, end_time: end, location: loc, status })} className="bg-gold-gradient text-black">Save</Button>
      </DialogFooter>
    </DialogContent>
  )
}
