import OpenAI from "openai"
import { NextResponse } from "next/server"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    console.log("ENV KEY:", process.env.OPENAI_API_KEY)

    const body = await req.json()

    const prompt = body.prompt

    console.log("PROMPT:", prompt)

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a cinematic viral video writer.",
        },
        {
          role: "user",
          content: `
Create:
1. Viral hook
2. Short cinematic narration
3. 5 cinematic scene breakdowns

Idea:
${prompt}
          `,
        },
      ],
    })

    console.log("OPENAI SUCCESS")

    return NextResponse.json({
      success: true,
      script: completion.choices[0].message.content,
    })
  } catch (error: any) {
    console.error("OPENAI ERROR:", error)

    return NextResponse.json({
      success: false,
      error: error.message,
    })
  }
}