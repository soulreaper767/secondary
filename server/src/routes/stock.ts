import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole, scopeToTerritoryWithAncestors } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/balance',
  scopeToTerritoryWithAncestors,
  asyncHandler(async (req, res) => {
    const { distributorId } = req.query;
    const where: any = {};
    if (distributorId) where.distributorId = Number(distributorId);
    else if (req.scopedNodeIds) where.distributor = { territoryNodeId: { in: req.scopedNodeIds } };
    const balances = await prisma.distributorStockBalance.findMany({
      where,
      include: { distributor: { select: { id: true, name: true } }, product: { include: { family: true } } },
      orderBy: [{ distributorId: 'asc' }, { productId: 'asc' }],
    });
    res.json(balances);
  })
);

router.get(
  '/ledger',
  asyncHandler(async (req, res) => {
    const { distributorId, productId, page = '1', pageSize = '50' } = req.query;
    const where: any = {};
    if (distributorId) where.distributorId = Number(distributorId);
    if (productId) where.productId = Number(productId);
    const take = Math.min(Number(pageSize), 200);
    const skip = (Number(page) - 1) * take;
    const [items, total] = await Promise.all([
      prisma.stockLedgerEntry.findMany({
        where,
        include: { distributor: { select: { id: true, name: true } }, product: { include: { family: true } } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.stockLedgerEntry.count({ where }),
    ]);
    res.json({ items, total, page: Number(page), pageSize: take });
  })
);

router.get(
  '/transfers',
  asyncHandler(async (req, res) => {
    const { distributorId } = req.query;
    const where: any = {};
    if (distributorId) where.distributorId = Number(distributorId);
    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: { distributor: { select: { id: true, name: true } }, items: { include: { product: { include: { family: true } } } } },
      orderBy: { transferDate: 'desc' },
    });
    res.json(transfers);
  })
);

const transferSchema = z.object({
  distributorId: z.number(),
  items: z.array(z.object({ productId: z.number(), qty: z.number().positive(), rate: z.number().positive() })).min(1),
});

router.post(
  '/transfers',
  requireRole('ADMIN', 'CSO', 'GM', 'RM', 'UM', 'AM'),
  asyncHandler(async (req, res) => {
    const body = transferSchema.parse(req.body);
    const referenceNo = `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const transfer = await prisma.$transaction(async (tx) => {
      const created = await tx.stockTransfer.create({
        data: {
          referenceNo,
          distributorId: body.distributorId,
          items: { create: body.items },
        },
        include: { items: true },
      });

      for (const line of body.items) {
        const balance = await tx.distributorStockBalance.upsert({
          where: { distributorId_productId: { distributorId: body.distributorId, productId: line.productId } },
          create: { distributorId: body.distributorId, productId: line.productId, qty: line.qty },
          update: { qty: { increment: line.qty } },
        });
        await tx.stockLedgerEntry.create({
          data: {
            distributorId: body.distributorId,
            productId: line.productId,
            type: 'INBOUND_PRIMARY',
            qty: line.qty,
            refType: 'StockTransfer',
            refId: created.id,
            balanceAfter: balance.qty,
          },
        });
      }
      return created;
    });

    res.status(201).json(transfer);
  })
);

export default router;
