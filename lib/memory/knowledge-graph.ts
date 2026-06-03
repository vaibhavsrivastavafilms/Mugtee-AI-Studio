import type { MemoryGraph, MemoryGraphEdge, MemoryGraphNode } from '@/lib/memory/types'
import { normalizeMemoryGraph } from '@/lib/memory/creator-memory-engine'

function nodeId(type: string, label: string): string {
  return `${type}:${label.toLowerCase().replace(/\s+/g, '_').slice(0, 60)}`
}

function upsertNode(
  nodes: MemoryGraphNode[],
  node: MemoryGraphNode
): MemoryGraphNode[] {
  const idx = nodes.findIndex((n) => n.id === node.id)
  if (idx >= 0) {
    const existing = nodes[idx]
    const next = [...nodes]
    next[idx] = {
      ...existing,
      weight: (existing.weight ?? 1) + (node.weight ?? 1),
    }
    return next
  }
  return [...nodes, node].slice(-100)
}

function upsertEdge(edges: MemoryGraphEdge[], edge: MemoryGraphEdge): MemoryGraphEdge[] {
  const key = `${edge.from}|${edge.to}|${edge.relation}`
  const exists = edges.some((e) => `${e.from}|${e.to}|${e.relation}` === key)
  if (exists) return edges
  return [...edges, edge].slice(-200)
}

export function linkTopicToProject(
  graph: MemoryGraph | unknown,
  topic: string,
  projectId: string
): MemoryGraph {
  const base = normalizeMemoryGraph(graph)
  let nodes = base.nodes ?? []
  let edges = base.edges ?? []

  const topicNode: MemoryGraphNode = {
    id: nodeId('topic', topic),
    type: 'topic',
    label: topic.slice(0, 120),
    weight: 1,
  }
  const projectNode: MemoryGraphNode = {
    id: nodeId('project', projectId),
    type: 'project',
    label: projectId.slice(0, 36),
    weight: 1,
  }

  nodes = upsertNode(nodes, topicNode)
  nodes = upsertNode(nodes, projectNode)
  edges = upsertEdge(edges, {
    from: topicNode.id,
    to: projectNode.id,
    relation: 'created',
  })

  return { nodes, edges, updatedAt: new Date().toISOString() }
}

export function linkHookToTheme(
  graph: MemoryGraph | unknown,
  hook: string,
  theme: string
): MemoryGraph {
  const base = normalizeMemoryGraph(graph)
  let nodes = base.nodes ?? []
  let edges = base.edges ?? []

  const hookNode: MemoryGraphNode = {
    id: nodeId('hook', hook.slice(0, 40)),
    type: 'hook',
    label: hook.slice(0, 120),
    weight: 1,
  }
  const themeNode: MemoryGraphNode = {
    id: nodeId('theme', theme),
    type: 'theme',
    label: theme.slice(0, 120),
    weight: 1,
  }

  nodes = upsertNode(nodes, hookNode)
  nodes = upsertNode(nodes, themeNode)
  edges = upsertEdge(edges, {
    from: hookNode.id,
    to: themeNode.id,
    relation: 'supports',
  })

  return { nodes, edges, updatedAt: new Date().toISOString() }
}

export function topNodesByType(
  graph: MemoryGraph | unknown,
  type: MemoryGraphNode['type'],
  limit = 5
): MemoryGraphNode[] {
  const base = normalizeMemoryGraph(graph)
  return (base.nodes ?? [])
    .filter((n) => n.type === type)
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, limit)
}

/** Creator → Brand → Campaign → Content → Assets */
export function linkCreatorToBrand(
  graph: MemoryGraph | unknown,
  creatorKey: string,
  brandSlug: string
): MemoryGraph {
  const base = normalizeMemoryGraph(graph)
  let nodes = base.nodes ?? []
  let edges = base.edges ?? []
  const creatorNode: MemoryGraphNode = {
    id: nodeId('creator', creatorKey),
    type: 'creator',
    label: creatorKey.slice(0, 36),
    weight: 1,
  }
  const brandNode: MemoryGraphNode = {
    id: nodeId('brand', brandSlug),
    type: 'brand',
    label: brandSlug.slice(0, 80),
    weight: 1,
  }
  nodes = upsertNode(nodes, creatorNode)
  nodes = upsertNode(nodes, brandNode)
  edges = upsertEdge(edges, { from: creatorNode.id, to: brandNode.id, relation: 'owns' })
  return { nodes, edges, updatedAt: new Date().toISOString() }
}

export function linkBrandToCampaign(
  graph: MemoryGraph | unknown,
  brandSlug: string,
  campaign: string
): MemoryGraph {
  const base = normalizeMemoryGraph(graph)
  let nodes = base.nodes ?? []
  let edges = base.edges ?? []
  const brandNode: MemoryGraphNode = {
    id: nodeId('brand', brandSlug),
    type: 'brand',
    label: brandSlug.slice(0, 80),
    weight: 1,
  }
  const campaignNode: MemoryGraphNode = {
    id: nodeId('campaign', campaign),
    type: 'campaign',
    label: campaign.slice(0, 120),
    weight: 1,
  }
  nodes = upsertNode(nodes, brandNode)
  nodes = upsertNode(nodes, campaignNode)
  edges = upsertEdge(edges, { from: brandNode.id, to: campaignNode.id, relation: 'runs' })
  return { nodes, edges, updatedAt: new Date().toISOString() }
}

export function linkCampaignToContent(
  graph: MemoryGraph | unknown,
  campaign: string,
  contentId: string
): MemoryGraph {
  const base = normalizeMemoryGraph(graph)
  let nodes = base.nodes ?? []
  let edges = base.edges ?? []
  const campaignNode: MemoryGraphNode = {
    id: nodeId('campaign', campaign),
    type: 'campaign',
    label: campaign.slice(0, 120),
    weight: 1,
  }
  const contentNode: MemoryGraphNode = {
    id: nodeId('content', contentId),
    type: 'content',
    label: contentId.slice(0, 36),
    weight: 1,
  }
  nodes = upsertNode(nodes, campaignNode)
  nodes = upsertNode(nodes, contentNode)
  edges = upsertEdge(edges, { from: campaignNode.id, to: contentNode.id, relation: 'produced' })
  return { nodes, edges, updatedAt: new Date().toISOString() }
}

export function linkContentToAsset(
  graph: MemoryGraph | unknown,
  contentId: string,
  assetLabel: string
): MemoryGraph {
  const base = normalizeMemoryGraph(graph)
  let nodes = base.nodes ?? []
  let edges = base.edges ?? []
  const contentNode: MemoryGraphNode = {
    id: nodeId('content', contentId),
    type: 'content',
    label: contentId.slice(0, 36),
    weight: 1,
  }
  const assetNode: MemoryGraphNode = {
    id: nodeId('asset', assetLabel.slice(0, 40)),
    type: 'asset',
    label: assetLabel.slice(0, 120),
    weight: 1,
  }
  nodes = upsertNode(nodes, contentNode)
  nodes = upsertNode(nodes, assetNode)
  edges = upsertEdge(edges, { from: contentNode.id, to: assetNode.id, relation: 'uses' })
  return { nodes, edges, updatedAt: new Date().toISOString() }
}
