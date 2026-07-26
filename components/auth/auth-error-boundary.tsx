'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { DevelopmentMode } from '@/components/auth/development-mode'
import { APP_ROUTE_LOGIN_FALLBACK } from '@/lib/auth/public-routes'
import { logAuthError } from '@/lib/auth/log-auth-error'

type Props = {
  children: ReactNode
  continueHref?: string
}

type State = {
  hasError: boolean
}

/**
 * Any auth UI failure falls through to Development Mode — never crash the login surface.
 */
export class AuthErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logAuthError('error-boundary', { error, componentStack: info.componentStack })
  }

  render() {
    if (this.state.hasError) {
      return (
        <DevelopmentMode
          continueHref={this.props.continueHref ?? APP_ROUTE_LOGIN_FALLBACK}
          variant="almost-ready"
        />
      )
    }

    return this.props.children
  }
}
