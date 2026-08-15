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
    const { retailerId, page = '1', pageSize = '50' } = req.query;
    const where: any = {};
    if (req.scopedNodeIds) where.retailer = { territoryNodeId: { in: req.scopedNodeIds } };
    if (retailerId) where.retailerId = Number(retailerId);
    const take = Math.min(Number(pageSize), 200);
    const skip = (Number(page) - 1) * take;
    const [items, total] = await Promise.all([
      prisma.receipt.findMany({
        where,
        include: { retailer: { select: { id: true, name: true } }, obUser: { select: { id: true, name: true } }, order: { select: { id: true, orderNumber: true, totalAmount: true } } },
        orderBy: { receivedAt: 'desc' },
        take,
        skip,
      }),
      prisma.receipt.count({ where }),
    ]);
    res.json({ items, total, page: Number(page), pageSize: take });
  })
);

const receiptSchema = z.object({
  retailerId: z.number(),
  orderId: z.number().optional(),
  amount: z.number().positive(),
  method: z.enum(['CASH', 'BANK', 'CREDIT_NOTE']).optional(),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = receiptSchema.parse(req.body);
    const receiptNumber = `RC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const receipt = await prisma.receipt.create({
      data: { receiptNumber, retailerId: body.retailerId, orderId: body.orderId, obUserId: req.user!.id, amount: body.amount, method: body.method || 'CASH' },
      include: { retailer: true, order: true },
    });
    res.status(201).json(receipt);
  })
);

// Outstanding balance per retailer: total order value vs total receipts collected.
router.get(
  '/outstanding',
  scopeToTerritory,
  asyncHandler(async (req, res) => {
    const where: any = { status: { not: 'CANCELLED' } };
    if (req.scopedNodeIds) where.territoryNodeId = { in: req.scopedNodeIds };
    const retailers = await prisma.retailer.findMany({
      where,
      select: {
        id: true,
        name: true,
        territoryNode: { select: { name: true } },
        orders: { where: { status: { not: 'CANCELLED' } }, select: { totalAmount: true } },
        receipts: { select: { amount: true } },
      },
    });
    const rows = retailers
      .map((r) => {
        const ordered = r.orders.reduce((s, o) => s + o.totalAmount, 0);
        const collected = r.receipts.reduce((s, p) => s + p.amount, 0);
        return { id: r.id, name: r.name, territory: r.territoryNode?.name, ordered, collected, outstanding: ordered - collected };
      })
      .filter((r) => r.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding);
    res.json(rows);
  })
);

export default router;
