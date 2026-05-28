import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Legacy workspace — unified at /create. */
export default function WorkspacePage() {
  redirect('/create')
}
