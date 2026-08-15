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
    const where: any = {};
    if (req.scopedNodeIds) where.retailer = { territoryNodeId: { in: req.scopedNodeIds } };
    const returns = await prisma.return.findMany({
      where,
      include: {
        retailer: { select: { id: true, name: true } },
        distributor: { select: { id: true, name: true } },
        obUser: { select: { id: true, name: true } },
        items: { include: { product: { include: { family: true } } } },
      },
      orderBy: { returnDate: 'desc' },
    });
    res.json(returns);
  })
);

const returnSchema = z.object({
  retailerId: z.number(),
  distributorId: z.number(),
  orderId: z.number().optional(),
  reason: z.string().optional(),
  items: z.array(z.object({ productId: z.number(), qty: z.number().positive(), unitPrice: z.number().positive() })).min(1),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = returnSchema.parse(req.body);
    const returnNumber = `RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const created = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const itemsData = body.items.map((i) => {
        const amount = i.qty * i.unitPrice;
        totalAmount += amount;
        return { productId: i.productId, qty: i.qty, unitPrice: i.unitPrice, amount };
      });

      const ret = await tx.return.create({
        data: {
          returnNumber,
          retailerId: body.retailerId,
          distributorId: body.distributorId,
          obUserId: req.user!.id,
          orderId: body.orderId,
          reason: body.reason,
          totalAmount,
          items: { create: itemsData },
        },
        include: { items: { include: { product: { include: { family: true } } } } },
      });

      for (const item of itemsData) {
        const balance = await tx.distributorStockBalance.upsert({
          where: { distributorId_productId: { distributorId: body.distributorId, productId: item.productId } },
          create: { distributorId: body.distributorId, productId: item.productId, qty: item.qty },
          update: { qty: { increment: item.qty } },
        });
        await tx.stockLedgerEntry.create({
          data: {
            distributorId: body.distributorId,
            productId: item.productId,
            type: 'RETURN_INBOUND',
            qty: item.qty,
            refType: 'Return',
            refId: ret.id,
            balanceAfter: balance.qty,
          },
        });
      }

      return ret;
    });

    res.status(201).json(created);
  })
);

export default router;
