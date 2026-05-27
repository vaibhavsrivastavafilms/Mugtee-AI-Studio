'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Clock3,
  ArrowRight,
} from 'lucide-react'

type Project = {
  id: string
  createdAt: string
  idea: string
  platform: string
  tone: string
  niche: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<
    Project[]
  >([])

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const response = await fetch(
        '/api/projects/save'
      )

      const data = await response.json()

      setProjects(data.projects || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-20 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,72,22,0.18),transparent_45%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
          }}
          className="mb-16"
        >
          <p className="text-[#C8A24E] uppercase tracking-[0.35em] text-xs mb-6">
            Creator Library
          </p>

          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-[#F4E7C1] leading-tight">
            Your cinematic projects.
          </h1>

          <p className="mt-6 text-white/60 max-w-2xl text-lg leading-8">
            Reload saved concepts,
            cinematic scripts and emotional
            storytelling ideas.
          </p>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="text-white/50">
            Loading projects...
          </div>
        )}

        {/* Empty State */}
        {!loading &&
          projects.length === 0 && (
            <div className="border border-white/10 rounded-[32px] p-12 text-center bg-white/[0.03] backdrop-blur-xl">
              <h2 className="text-2xl text-[#F4E7C1] mb-4">
                No saved projects yet
              </h2>

              <p className="text-white/60">
                Generate and save your first
                cinematic project.
              </p>

              <Link
                href="/workspace"
                className="inline-flex mt-8 px-6 py-3 rounded-2xl bg-[#D4AF37] text-black font-medium hover:bg-[#E7C56A] transition-all duration-300"
              >
                Open Workspace
              </Link>
            </div>
          )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: index * 0.05,
              }}
              className="bg-white/[0.03] border border-white/10 rounded-[32px] p-8 backdrop-blur-xl hover:border-[#D4AF37]/20 transition-all duration-300"
            >
              {/* Top */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <Clock3 className="w-4 h-4" />

                  {new Date(
                    project.createdAt
                  ).toLocaleDateString()}
                </div>

                <div className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
                  {project.platform}
                </div>
              </div>

              {/* Idea */}
              <h2 className="text-2xl font-semibold text-[#F4E7C1] leading-tight">
                {project.idea}
              </h2>

              {/* Tags */}
              <div className="flex flex-wrap gap-3 mt-6">
                <Tag text={project.tone} />

                <Tag text={project.niche} />
              </div>

              {/* Open */}
              <Link
                href="/workspace"
                className="mt-10 inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#E7C56A] transition-all duration-300"
              >
                Open Project

                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Tag({
  text,
}: {
  text: string
}) {
  return (
    <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white/70">
      {text}
    </div>
  )
}