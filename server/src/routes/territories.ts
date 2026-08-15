import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { buildPath, getSubtreeNodeIds, getUniverseSummary } from '../lib/territory';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const nodes = await prisma.territoryNode.findMany({
      include: { managerUser: { select: { id: true, name: true } } },
      orderBy: { path: 'asc' },
    });
    res.json(nodes);
  })
);

router.get(
  '/tree',
  asyncHandler(async (_req, res) => {
    const nodes = await prisma.territoryNode.findMany({
      include: { managerUser: { select: { id: true, name: true } } },
      orderBy: { path: 'asc' },
    });
    const byId = new Map<number, any>(nodes.map((n) => [n.id, { ...n, children: [] as any[] }]));
    const roots: any[] = [];
    for (const n of byId.values()) {
      if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId).children.push(n);
      else roots.push(n);
    }
    res.json(roots);
  })
);

router.get(
  '/:id/summary',
  asyncHandler(async (req, res) => {
    const nodeIds = await getSubtreeNodeIds(Number(req.params.id));
    if (nodeIds.length === 0) throw new ApiError(404, 'Territory not found');
    const universe = await getUniverseSummary(nodeIds);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const salesAgg = await prisma.order.aggregate({
      where: { retailer: { territoryNodeId: { in: nodeIds } }, orderDate: { gte: monthStart }, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    });
    const distributorCount = await prisma.distributor.count({ where: { territoryNodeId: { in: nodeIds } } });
    const userCount = await prisma.user.count({ where: { territoryNodeId: { in: nodeIds } } });

    res.json({
      universe,
      mtdSalesValue: salesAgg._sum.totalAmount || 0,
      mtdOrderCount: salesAgg._count._all,
      distributorCount,
      userCount,
      nodeCount: nodeIds.length,
    });
  })
);

const nodeSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  level: z.enum(['NATIONAL', 'REGION', 'SUB_REGION', 'AREA', 'TERRITORY']),
  parentId: z.number().nullable().optional(),
  managerUserId: z.number().nullable().optional(),
});

router.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = nodeSchema.parse(req.body);
    let path = '-';
    if (body.parentId) {
      const parent = await prisma.territoryNode.findUnique({ where: { id: body.parentId } });
      if (!parent) throw new ApiError(400, 'Parent territory not found');
      path = parent.path;
    }
    const created = await prisma.territoryNode.create({
      data: {
        name: body.name,
        code: body.code,
        level: body.level,
        parentId: body.parentId ?? null,
        managerUserId: body.managerUserId ?? null,
        path: '-temp-',
      },
    });
    const finalPath = buildPath(path === '-' ? null : path, created.id);
    const updated = await prisma.territoryNode.update({ where: { id: created.id }, data: { path: finalPath } });
    res.status(201).json(updated);
  })
);

router.put(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = nodeSchema.partial().parse(req.body);
    const updated = await prisma.territoryNode.update({
      where: { id: Number(req.params.id) },
      data: { name: body.name, code: body.code, managerUserId: body.managerUserId },
    });
    res.json(updated);
  })
);

router.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const childCount = await prisma.territoryNode.count({ where: { parentId: id } });
    if (childCount > 0) throw new ApiError(400, 'Cannot delete a territory that has child territories');
    await prisma.territoryNode.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
