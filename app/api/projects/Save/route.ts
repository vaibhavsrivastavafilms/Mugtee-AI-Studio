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

// Global in-memory storage
declare global {
  var mugteeProjects: Project[] | undefined
}

const projects =
  global.mugteeProjects || []

global.mugteeProjects = projects

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      idea,
      platform,
      tone,
      niche,
      result,
    } = body

    const project: Project = {
      id: crypto.randomUUID(),

      createdAt:
        new Date().toISOString(),

      idea,
      platform,
      tone,
      niche,

      result,
    }

    projects.unshift(project)

    return NextResponse.json({
      success: true,
      project,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save project',
      },
      {
        status: 500,
      }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    projects,
  })
}