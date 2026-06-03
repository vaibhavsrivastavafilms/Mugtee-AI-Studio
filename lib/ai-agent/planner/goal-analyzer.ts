import { GoalAnalysisSchema, type GoalAnalysis } from '@/lib/ai-agent/types'
import { callStructuredJson } from '@/lib/ai-agent/structured-llm'
import { routeModelForAgentTask } from '@/lib/ai/model-router'

export async function analyzeGoal(
  goal: string,
  memoryContext?: string
): Promise<GoalAnalysis> {
  const modelHint = routeModelForAgentTask(/research|analyze|strategy/i.test(goal) ? 'reasoning' : 'creative')

  const raw = await callStructuredJson<GoalAnalysis>({
    system:
      `You are MugteeOS goal analyzer (model tier: ${modelHint.quality}, cost: ${modelHint.costHint}). Extract structured intent for short-form cinematic content creation.`,
    user: `User goal: "${goal.trim()}"${memoryContext ? `\n\nCreator memory:\n${memoryContext}` : ''}`,
    schemaHint:
      '{"goal":"string","intent":"string","audience?":"string","platform?":"string","tone?":"string","deliverables":["string"],"constraints?":["string"],"keywords?":["string"]}',
  })

  return GoalAnalysisSchema.parse({
    ...raw,
    goal: raw.goal || goal.trim(),
  })
}
