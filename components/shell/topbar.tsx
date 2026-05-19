'use client'
import { Menu, Search, Bell, Plus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function Topbar({ user, onMenu }: { user: { email?: string | null; user_metadata?: any }; onMenu: () => void }) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Producer'
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture
  const initials = (name as string).split(' ').map((p: string) => p[0]).slice(0,2).join('').toUpperCase()

  return (
    <header className="sticky top-0 z-30 glass border-b border-gold-soft">
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-16">
        <button onClick={onMenu} className="lg:hidden p-2 rounded-lg hover:bg-white/5">
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search content, crew, shoots…"
            className="pl-10 h-10 bg-white/[0.03] border-white/[0.06] focus-visible:ring-gold-500/40 focus-visible:border-gold-500/40" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="hidden sm:inline-flex h-9 gap-2 bg-gold-gradient text-black hover:opacity-90 font-medium shadow-gold-glow">
            <Plus className="w-4 h-4" /> New Content
          </Button>

          <button className="relative p-2.5 rounded-xl hover:bg-white/5 transition">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse-gold" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-white/5 transition">
                <Avatar className="w-8 h-8 ring-2 ring-gold-500/40">
                  {avatar && <AvatarImage src={avatar} />}
                  <AvatarFallback className="bg-gold-gradient text-black text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-medium leading-tight">{name}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">Showrunner</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-strong">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Studio Settings</DropdownMenuItem>
              <DropdownMenuItem>Billing</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/auth/signout" className="text-red-300 focus:text-red-200">Sign out</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
