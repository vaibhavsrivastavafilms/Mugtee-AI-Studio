"use client"

import { useState } from "react"

export default function TestPage() {
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    try {
      setLoading(true)

      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      })

      const data = await res.json()

      setResult(data.script || "No response received")
    } catch (error) {
      console.error(error)
      setResult("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          Mugtee AI Prompt Engine
        </h1>

        <textarea
          className="w-full h-40 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-lg outline-none"
          placeholder="Describe your cinematic viral video idea..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <button
          onClick={generate}
          disabled={loading}
          className="mt-6 px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-2xl transition"
        >
          {loading ? "Generating..." : "Generate Script"}
        </button>

        <div className="mt-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 whitespace-pre-wrap">
          {result}
        </div>
      </div>
    </div>
  )
}