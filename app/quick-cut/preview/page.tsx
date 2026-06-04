import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Quick Cut preview session is preserved via localStorage on /create. */
export default function QuickCutPreviewPage() {
  redirect('/studio/quick')
}
