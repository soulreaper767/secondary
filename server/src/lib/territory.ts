import { prisma } from './prisma';

/** Materialized path for a node given its parent's path and its own id, e.g. "-1-4-12-". */
export function buildPath(parentPath: string | null, id: number): string {
  return `${parentPath ?? '-'}${id}-`;
}

/** All descendant node ids of `nodeId`, including itself, via materialized-path prefix match. */
export async function getSubtreeNodeIds(nodeId: number): Promise<number[]> {
  const node = await prisma.territoryNode.findUnique({ where: { id: nodeId } });
  if (!node) return [];
  const descendants = await prisma.territoryNode.findMany({
    where: { path: { startsWith: node.path } },
    select: { id: true },
  });
  return descendants.map((d) => d.id);
}

/**
 * Resolves the set of territory node ids a user is allowed to see.
 * - Users pinned to a node (RM/UM/AM/TSO/OB) get that node's full subtree.
 * - ADMIN / CSO / GM (no territoryNodeId, national-scope roles) see every node.
 */
export async function resolveScopedNodeIds(user: {
  territoryNodeId: number | null;
  role: { code: string };
}): Promise<number[] | null> {
  if (user.role.code === 'ADMIN' || user.role.code === 'DISTRIBUTOR') return null; // null = unrestricted (admin) or n/a
  if (user.territoryNodeId) return getSubtreeNodeIds(user.territoryNodeId);
  // CSO / GM: national scope, everything under the National root(s).
  const roots = await prisma.territoryNode.findMany({ where: { level: 'NATIONAL' }, select: { id: true } });
  const all = new Set<number>();
  for (const r of roots) {
    (await getSubtreeNodeIds(r.id)).forEach((id) => all.add(id));
  }
  return Array.from(all);
}

/**
 * Same as resolveScopedNodeIds, but also includes ancestor node ids.
 * Distributors (and other facilities) are attached to an AREA node, which sits
 * *above* a TSO/OB's own TERRITORY node — without ancestors, field users would
 * never see the distributor that actually serves them.
 */
export async function resolveScopedNodeIdsWithAncestors(user: {
  territoryNodeId: number | null;
  role: { code: string };
}): Promise<number[] | null> {
  const subtree = await resolveScopedNodeIds(user);
  if (subtree === null) return null; // unrestricted
  if (!user.territoryNodeId) return subtree;
  const ancestors = await getAncestorNodes(user.territoryNodeId);
  return Array.from(new Set([...subtree, ...ancestors.map((a) => a.id)]));
}

/** All ancestor nodes of `nodeId` (nearest first), NOT including itself. */
export async function getAncestorNodes(nodeId: number) {
  const node = await prisma.territoryNode.findUnique({ where: { id: nodeId } });
  if (!node) return [];
  const ids = node.path
    .split('-')
    .filter(Boolean)
    .map(Number)
    .filter((id) => id !== node.id);
  const ancestors = await prisma.territoryNode.findMany({ where: { id: { in: ids } } });
  // path is root->leaf order; return nearest-ancestor-first.
  return ancestors.sort((a, b) => b.path.length - a.path.length);
}

export interface UniverseSummary {
  total: number;
  untapped: number;
  covered: number;
  productive: number;
  nonProductive: number;
}

export async function getUniverseSummary(nodeIds: number[] | null): Promise<UniverseSummary> {
  const where = nodeIds ? { territoryNodeId: { in: nodeIds } } : {};
  const rows = await prisma.retailer.groupBy({
    by: ['status'],
    where,
    _count: { _all: true },
  });
  const summary: UniverseSummary = { total: 0, untapped: 0, covered: 0, productive: 0, nonProductive: 0 };
  for (const row of rows) {
    const count = row._count._all;
    summary.total += count;
    if (row.status === 'UNTAPPED') summary.untapped = count;
    if (row.status === 'PRODUCTIVE') summary.productive = count;
    if (row.status === 'NON_PRODUCTIVE') summary.nonProductive = count;
  }
  // Covered is derived, never stored — this is what guarantees
  // Universe = Untapped + Covered and Covered = Productive + Non-Productive
  // hold exactly, at all times, instead of merely "usually".
  summary.covered = summary.productive + summary.nonProductive;
  return summary;
}
