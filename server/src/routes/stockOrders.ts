import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole, scopeToTerritoryWithAncestors } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  scopeToTerritoryWithAncestors,
  asyncHandler(async (req, res) => {
    const where: any = {};
    if (req.user!.role.code === 'DISTRIBUTOR') {
      const distributor = await prisma.distributor.findUnique({ where: { userId: req.user!.id } });
      where.distributorId = distributor?.id ?? -1;
    } else if (req.scopedNodeIds) {
      where.distributor = { territoryNodeId: { in: req.scopedNodeIds } };
    }
    if (req.query.status) where.status = String(req.query.status);
    const stockOrders = await prisma.stockOrder.findMany({
      where,
      include: { distributor: { select: { id: true, name: true } }, requestedByUser: { select: { id: true, name: true } }, items: { include: { product: { include: { family: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(stockOrders);
  })
);

const stockOrderSchema = z.object({
  distributorId: z.number(),
  notes: z.string().optional(),
  items: z.array(z.object({ productId: z.number(), qty: z.number().positive() })).min(1),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = stockOrderSchema.parse(req.body);
    const orderNumber = `SI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const stockOrder = await prisma.stockOrder.create({
      data: {
        orderNumber,
        distributorId: body.distributorId,
        requestedByUserId: req.user!.id,
        notes: body.notes,
        items: { create: body.items },
      },
      include: { distributor: true, items: { include: { product: { include: { family: true } } } } },
    });
    res.status(201).json(stockOrder);
  })
);

router.post(
  '/:id/reject',
  requireRole('ADMIN', 'CSO', 'GM', 'RM', 'UM', 'AM'),
  asyncHandler(async (req, res) => {
    const stockOrder = await prisma.stockOrder.update({ where: { id: Number(req.params.id) }, data: { status: 'REJECTED' } });
    res.json(stockOrder);
  })
);

router.post(
  '/:id/approve',
  requireRole('ADMIN', 'CSO', 'GM', 'RM', 'UM', 'AM'),
  asyncHandler(async (req, res) => {
    const stockOrder = await prisma.stockOrder.update({ where: { id: Number(req.params.id) }, data: { status: 'APPROVED' } });
    res.json(stockOrder);
  })
);

const fulfillSchema = z.object({
  rates: z.record(z.string(), z.number().positive()).optional(), // productId -> rate override
});

// Approves (if needed) and fulfils a stock order by issuing the matching
// primary StockTransfer, exactly like a manual transfer would.
router.post(
  '/:id/fulfill',
  requireRole('ADMIN', 'CSO', 'GM', 'RM', 'UM', 'AM'),
  asyncHandler(async (req, res) => {
    const body = fulfillSchema.parse(req.body);
    const id = Number(req.params.id);
    const stockOrder = await prisma.stockOrder.findUnique({ where: { id }, include: { items: { include: { product: { include: { family: true } } } } } });
    if (!stockOrder) throw new ApiError(404, 'Stock order not found');
    if (stockOrder.status === 'FULFILLED') throw new ApiError(400, 'Already fulfilled');

    const referenceNo = `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const transfer = await prisma.$transaction(async (tx) => {
      const items = stockOrder.items.map((i) => ({ productId: i.productId, qty: i.qty, rate: body.rates?.[String(i.productId)] ?? i.product.distributorPrice }));
      const created = await tx.stockTransfer.create({
        data: { referenceNo, distributorId: stockOrder.distributorId, items: { create: items } },
        include: { items: { include: { product: { include: { family: true } } } } },
      });
      for (const item of items) {
        const balance = await tx.distributorStockBalance.upsert({
          where: { distributorId_productId: { distributorId: stockOrder.distributorId, productId: item.productId } },
          create: { distributorId: stockOrder.distributorId, productId: item.productId, qty: item.qty },
          update: { qty: { increment: item.qty } },
        });
        await tx.stockLedgerEntry.create({
          data: {
            distributorId: stockOrder.distributorId,
            productId: item.productId,
            type: 'INBOUND_PRIMARY',
            qty: item.qty,
            refType: 'StockTransfer',
            refId: created.id,
            balanceAfter: balance.qty,
          },
        });
      }
      await tx.stockOrder.update({ where: { id }, data: { status: 'FULFILLED' } });
      return created;
    });

    res.status(201).json(transfer);
  })
);

export default router;
