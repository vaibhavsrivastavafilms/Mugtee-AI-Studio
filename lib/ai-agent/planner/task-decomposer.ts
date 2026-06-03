import { z } from 'zod'
import { DecomposedTaskSchema, type DecomposedTask, type GoalAnalysis } from '@/lib/ai-agent/types'
import { callStructuredJson } from '@/lib/ai-agent/structured-llm'
import { routeIntent } from '@/lib/ai-agent/intent-router'
import { TOOL_NAMES, isRegisteredTool } from '@/lib/ai-agent/tool-registry'

const DecomposeResponseSchema = z.object({
  tasks: z.array(DecomposedTaskSchema),
})

export async function decomposeTasks(analysis: GoalAnalysis): Promise<DecomposedTask[]> {
  const routed = routeIntent(analysis)

  const raw = await callStructuredJson<z.infer<typeof DecomposeResponseSchema>>({
    system:
      'You decompose creator goals into a DAG of agent tasks. Only use tools from the allowed list. Use agent roles: coordinator, content, strategy, creative, memory.',
    user: `Goal analysis: ${JSON.stringify(analysis)}\nSuggested tools: ${routed.tools.join(', ')}\nAllowed tools: ${TOOL_NAMES.join(', ')}`,
    schemaHint: `{"tasks":[{"id":"t1","type":"script","tool":"generateScript","agent":"content","description":"...","dependencies":[]}]} `,
    max_tokens: 1400,
  })

  const parsed = DecomposeResponseSchema.parse(raw)
  return parsed.tasks
    .filter((t) => !t.tool || isRegisteredTool(t.tool))
    .map((t, i) => ({
      ...t,
      id: t.id || `task_${i + 1}`,
      dependencies: t.dependencies ?? [],
    }))
}
