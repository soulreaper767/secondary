import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { scopeToTerritory } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  scopeToTerritory,
  asyncHandler(async (req, res) => {
    const { retailerId } = req.query;
    const where: any = {};
    if (req.scopedNodeIds) where.retailer = { territoryNodeId: { in: req.scopedNodeIds } };
    if (retailerId) where.retailerId = Number(retailerId);
    const stockTakes = await prisma.stockTake.findMany({
      where,
      include: { retailer: { select: { id: true, name: true } }, obUser: { select: { id: true, name: true } }, items: { include: { product: true } } },
      orderBy: { takenAt: 'desc' },
      take: 200,
    });
    res.json(stockTakes);
  })
);

const stockTakeSchema = z.object({
  retailerId: z.number(),
  visitId: z.number().optional(),
  items: z.array(z.object({ productId: z.number(), qty: z.number().min(0) })).min(1),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = stockTakeSchema.parse(req.body);
    const stockTake = await prisma.stockTake.create({
      data: { retailerId: body.retailerId, obUserId: req.user!.id, visitId: body.visitId, items: { create: body.items } },
      include: { items: { include: { product: true } } },
    });
    res.status(201).json(stockTake);
  })
);

export default router;
