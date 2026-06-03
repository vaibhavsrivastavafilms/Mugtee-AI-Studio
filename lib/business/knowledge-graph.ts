import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BusinessKnowledgeGraph,
  BusinessGraphEdge,
  BusinessGraphNode,
  FunnelStage,
} from '@/lib/business/types'
import {
  getOrCreateBusinessTwin,
  listAudienceSegments,
  listContentOutcomes,
  listLeads,
  listRevenueEvents,
} from '@/lib/business/business-memory'

function nodeId(type: string, id: string): string {
  return `${type}:${id}`
}

function upsertNode(nodes: BusinessGraphNode[], node: BusinessGraphNode): BusinessGraphNode[] {
  const idx = nodes.findIndex((n) => n.id === node.id)
  if (idx >= 0) {
    const next = [...nodes]
    next[idx] = { ...next[idx], weight: (next[idx].weight ?? 1) + (node.weight ?? 1) }
    return next
  }
  return [...nodes, node].slice(-120)
}

function upsertEdge(edges: BusinessGraphEdge[], edge: BusinessGraphEdge): BusinessGraphEdge[] {
  const key = `${edge.from}|${edge.to}|${edge.relation}`
  if (edges.some((e) => `${e.from}|${e.to}|${e.relation}` === key)) return edges
  return [...edges, edge].slice(-240)
}

/** brand → audience → campaign → lead → customer → revenue */
export async function buildBusinessKnowledgeGraph(
  supabase: SupabaseClient,
  userId: string,
  brandId?: string | null
): Promise<BusinessKnowledgeGraph> {
  const [twin, segments, leads, revenue, outcomes] = await Promise.all([
    getOrCreateBusinessTwin(supabase, userId, { brandId: brandId ?? undefined }),
    listAudienceSegments(supabase, userId),
    listLeads(supabase, userId, 30),
    listRevenueEvents(supabase, userId, 20),
    listContentOutcomes(supabase, userId, 30),
  ])

  let nodes: BusinessGraphNode[] = []
  let edges: BusinessGraphEdge[] = []

  const brandNode: BusinessGraphNode = {
    id: nodeId('brand', twin.brandId ?? twin.id),
    type: 'brand',
    label: twin.displayName,
    weight: 2,
  }
  nodes = upsertNode(nodes, brandNode)

  for (const seg of segments) {
    const n: BusinessGraphNode = {
      id: nodeId('audience', seg.id),
      type: 'audience',
      label: seg.name,
      weight: seg.sizeEstimate / 1000 || 1,
    }
    nodes = upsertNode(nodes, n)
    edges = upsertEdge(edges, {
      from: brandNode.id,
      to: n.id,
      relation: 'targets',
    })
  }

  for (const camp of twin.model.campaigns) {
    const n: BusinessGraphNode = {
      id: nodeId('campaign', camp.id),
      type: 'campaign',
      label: camp.name,
      weight: 1,
    }
    nodes = upsertNode(nodes, n)
    edges = upsertEdge(edges, {
      from: brandNode.id,
      to: n.id,
      relation: 'runs',
    })
  }

  for (const lead of leads) {
    const n: BusinessGraphNode = {
      id: nodeId('lead', lead.id),
      type: 'lead',
      label: String(lead.contact.name ?? lead.contact.email ?? `Lead ${lead.score}`),
      weight: lead.score / 50,
    }
    nodes = upsertNode(nodes, n)
    edges = upsertEdge(edges, {
      from: brandNode.id,
      to: n.id,
      relation: 'captures',
    })
    if (lead.status === 'won') {
      const cust: BusinessGraphNode = {
        id: nodeId('customer', lead.id),
        type: 'customer',
        label: `Customer ${lead.id.slice(0, 8)}`,
        weight: 2,
      }
      nodes = upsertNode(nodes, cust)
      edges = upsertEdge(edges, { from: n.id, to: cust.id, relation: 'converted' })
    }
  }

  for (const rev of revenue) {
    const n: BusinessGraphNode = {
      id: nodeId('revenue', rev.id),
      type: 'revenue',
      label: `₹${rev.amountInr}`,
      weight: Math.min(5, rev.amountInr / 10000),
    }
    nodes = upsertNode(nodes, n)
    if (rev.leadId) {
      edges = upsertEdge(edges, {
        from: nodeId('lead', rev.leadId),
        to: n.id,
        relation: 'paid',
      })
    } else {
      edges = upsertEdge(edges, { from: brandNode.id, to: n.id, relation: 'earned' })
    }
  }

  for (const out of outcomes) {
    const cid = out.contentAssetId ?? out.projectId
    if (!cid) continue
    const n: BusinessGraphNode = {
      id: nodeId('content', cid),
      type: 'content',
      label: cid.slice(0, 8),
      weight: out.engagementScore / 100,
    }
    nodes = upsertNode(nodes, n)
    edges = upsertEdge(edges, {
      from: n.id,
      to: brandNode.id,
      relation: `drives_${out.funnelStage}`,
    })
    if (out.leadId) {
      edges = upsertEdge(edges, {
        from: n.id,
        to: nodeId('lead', out.leadId),
        relation: 'generated_lead',
      })
    }
  }

  return { nodes, edges }
}

export function funnelStageCounts(
  items: { funnelStage: FunnelStage }[]
): Record<FunnelStage, number> {
  const base: Record<FunnelStage, number> = {
    awareness: 0,
    consideration: 0,
    conversion: 0,
    retention: 0,
  }
  for (const item of items) {
    base[item.funnelStage] = (base[item.funnelStage] ?? 0) + 1
  }
  return base
}
