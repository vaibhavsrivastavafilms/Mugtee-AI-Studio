import { ProjectWorkspacePage } from '@/components/create/project-workspace-page'

export const dynamic = 'force-dynamic'

export default function StudioProjectWorkspacePage() {
  return (
    <div className="-mx-3 sm:-mx-5 lg:-mx-6 -my-4 sm:-my-5 lg:-my-6 min-h-[calc(100dvh-4rem)]">
      <ProjectWorkspacePage />
    </div>
  )
}
