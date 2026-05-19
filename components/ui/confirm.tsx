'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'

interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  destructive?: boolean
}

interface State {
  open: boolean
  opts: ConfirmOptions
  resolve: (v: boolean) => void
}

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ open: false, opts: { title: '' }, resolve: () => {} })

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, opts, resolve })
    })
  }, [])

  const close = (v: boolean) => {
    state.resolve(v)
    setState(s => ({ ...s, open: false }))
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={state.open} onOpenChange={(o) => { if (!o) close(false) }}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">{state.opts.title}</AlertDialogTitle>
            {state.opts.description && (
              <AlertDialogDescription className="text-luxe/70">{state.opts.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => close(true)}
              className={state.opts.destructive
                ? 'bg-red-500/90 hover:bg-red-500 text-white'
                : 'bg-gold-gradient text-black hover:opacity-90'}
            >
              {state.opts.confirmText || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm requires ConfirmProvider')
  return ctx
}
