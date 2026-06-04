'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

type ExportErrorBoundaryProps = {
  children: React.ReactNode
  className?: string
  onRetry?: () => void
}

type ExportErrorBoundaryState = {
  error: Error | null
}

export class ExportErrorBoundary extends React.Component<
  ExportErrorBoundaryProps,
  ExportErrorBoundaryState
> {
  state: ExportErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ExportErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[MUGTEE EXPORT] boundary', {
      message: error.message,
      componentStack: info.componentStack?.slice(0, 2000),
    })
  }

  private handleRetry = (): void => {
    this.setState({ error: null })
    this.props.onRetry?.()
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div
          className={cn(
            'rounded-xl border border-red-500/25 bg-red-950/20 p-4 space-y-3',
            this.props.className
          )}
          role="alert"
        >
          <div className="flex items-start gap-2 text-red-200/90">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-medium">Export failed. Your project is safe. Try again.</p>
              <p className="text-[11px] text-red-200/60">{this.state.error.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.16em] uppercase text-gold-200/90 hover:text-gold-100"
          >
            <RefreshCw className="w-3 h-3" aria-hidden />
            Retry export panel
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
