import { NextResponse } from 'next/server'

type Project = {
  id: string
  createdAt: string
  idea: string
  platform: string
  tone: string
  niche: string
  result: {
    hook: string
    script: string
    captions: string
    thumbnail: string
  }
}

declare global {
  var mugteeProjects:
    | Project[]
    | undefined
}

const projects =
  global.mugteeProjects || []

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  const { id } = await params
  try {
    const project = projects.find(
      (item) => item.id === id
    )

    if (!project) {
      return NextResponse.json(
        {
          error: 'Project not found',
        },
        {
          status: 404,
        }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error:
          'Failed to fetch project',
      },
      {
        status: 500,
      }
    )
  }
}