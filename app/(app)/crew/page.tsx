'use client'
import { useStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mail, MoreHorizontal, Plus, Trash2, Edit3, Users2, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton, EmptyState } from '@/components/ui/state'
import { useConfirm } from '@/components/ui/confirm'
import { useState } from 'react'
import type { CrewMember, CrewStatus } from '@/lib/types'

export default function CrewPage() {
  const { crew, loading, addCrew, updateCrew, removeCrew, archiveCrew } = useStore()
  const confirm = useConfirm()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CrewMember | null>(null)

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Crew</div>
          <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">The</span> ensemble</h1>
          <p className="text-luxe/70 mt-2">Your in-house production team.</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button className="h-10 bg-gold-gradient text-black gap-2 shadow-gold-glow"><Plus className="w-4 h-4" /> Add crew</Button>
          </DialogTrigger>
          <CrewDialog onSubmit={async (data) => { await addCrew(data); setCreating(false) }} />
        </Dialog>
      </motion.div>

      {loading.crew ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : crew.length === 0 ? (
        <EmptyState icon={Users2} title="No crew yet" description="Add your first crew member to start assembling the ensemble." action={<Button className="bg-gold-gradient text-black" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> Add crew</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {crew.map((c, i) => (
            <motion.div key={c.id}
              initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{delay:Math.min(i*0.05, 0.5)}}
              whileHover={{y:-3}}
              className="glass rounded-2xl p-5 hover:shadow-cinema"
            >
              <div className="flex items-start gap-4">
                <Avatar className="w-14 h-14 ring-2 ring-gold-500/40">
                  {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                  <AvatarFallback className="bg-gold-gradient text-black font-semibold">{c.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg leading-tight truncate">{c.name}</div>
                  {c.role && <div className="text-xs text-gold-400/90 mt-0.5 tracking-wide">{c.role}</div>}
                  <div className={cn('mt-2 inline-flex items-center gap-1.5 text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full',
                    c.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' :
                    c.status === 'busy' ? 'bg-orange-500/15 text-orange-300' : 'bg-zinc-500/15 text-zinc-400'
                  )}>
                    <span className="w-1 h-1 rounded-full bg-current" />{c.status || 'offline'}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded-lg hover:bg-white/5"><MoreHorizontal className="w-4 h-4" /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-strong">
                    <DropdownMenuItem onClick={() => setEditing(c)}><Edit3 className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => archiveCrew(c.id)}><Archive className="w-3.5 h-3.5 mr-2" />Archive</DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => { if (await confirm({ title: `Remove ${c.name}?`, description: 'They will be moved to trash and can be restored from Settings.', destructive: true })) removeCrew(c.id) }} className="text-red-300 focus:text-red-200"><Trash2 className="w-3.5 h-3.5 mr-2" />Move to trash</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="gold-divider my-4" />
              <div className="flex items-center justify-between text-xs">
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-gold-300"><Mail className="w-3.5 h-3.5" /> Message</button>
                <button onClick={() => setEditing(c)} className="text-gold-400 hover:text-gold-300">View profile →</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <CrewDialog initial={editing} onSubmit={async (data) => { await updateCrew(editing.id, data); setEditing(null) }} />
        )}
      </Dialog>
    </div>
  )
}

function CrewDialog({ initial, onSubmit }: { initial?: CrewMember; onSubmit: (data: Partial<CrewMember>) => void | Promise<void> }) {
  const [name, setName] = useState(initial?.name || '')
  const [role, setRole] = useState(initial?.role || '')
  const [status, setStatus] = useState<CrewStatus>((initial?.status as CrewStatus) || 'active')
  const [avatar, setAvatar] = useState(initial?.avatar_url || '')
  return (
    <DialogContent className="glass-strong sm:max-w-md">
      <DialogHeader><DialogTitle className="font-display text-2xl">{initial ? 'Edit crew' : 'Add crew'}</DialogTitle></DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Name</label>
          <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Aria Knox" className="bg-white/[0.03]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Role</label>
          <Input value={role} onChange={e=>setRole(e.target.value)} placeholder="Director of Photography" className="bg-white/[0.03]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Status</label>
          <Select value={status} onValueChange={(v)=>setStatus(v as CrewStatus)}>
            <SelectTrigger className="bg-white/[0.03]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Avatar URL</label>
          <Input value={avatar} onChange={e=>setAvatar(e.target.value)} placeholder="https://…" className="bg-white/[0.03]" />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit({ name: name || 'Unnamed', role, status, avatar_url: avatar })} className="bg-gold-gradient text-black">Save</Button>
      </DialogFooter>
    </DialogContent>
  )
}
