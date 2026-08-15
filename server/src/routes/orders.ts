import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { scopeToTerritory } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  scopeToTerritory,
  asyncHandler(async (req, res) => {
    const { distributorId, obUserId, from, to, page = '1', pageSize = '50' } = req.query;
    const where: any = {};
    if (req.scopedNodeIds) where.retailer = { territoryNodeId: { in: req.scopedNodeIds } };
    if (distributorId) where.distributorId = Number(distributorId);
    if (obUserId) where.obUserId = Number(obUserId);
    if (from || to) where.orderDate = {
      ...(from ? { gte: new Date(String(from)) } : {}),
      ...(to ? { lte: new Date(String(to)) } : {}),
    };
    const take = Math.min(Number(pageSize), 200);
    const skip = (Number(page) - 1) * take;
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          retailer: { select: { id: true, name: true, territoryNodeId: true } },
          obUser: { select: { id: true, name: true } },
          distributor: { select: { id: true, name: true } },
          items: { include: { product: { include: { family: true } } } },
        },
        orderBy: { orderDate: 'desc' },
        take,
        skip,
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ items, total, page: Number(page), pageSize: take });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: Number(req.params.id) },
      include: { retailer: true, obUser: true, distributor: true, items: { include: { product: { include: { family: true } } } } },
    });
    if (!order) throw new ApiError(404, 'Order not found');
    res.json(order);
  })
);

const orderSchema = z.object({
  retailerId: z.number(),
  distributorId: z.number(),
  items: z.array(z.object({ productId: z.number(), qty: z.number().positive(), unitPrice: z.number().positive() })).min(1),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = orderSchema.parse(req.body);
    const obUserId = req.user!.id;

    const order = await prisma.$transaction(async (tx) => {
      const retailerBefore = await tx.retailer.findUniqueOrThrow({ where: { id: body.retailerId } });
      const madeProductive = retailerBefore.status !== 'PRODUCTIVE';

      // Verify & decrement stock per line, recording ledger entries.
      let totalAmount = 0;
      const itemsData: { productId: number; qty: number; unitPrice: number; amount: number }[] = [];
      for (const line of body.items) {
        const balance = await tx.distributorStockBalance.findUnique({
          where: { distributorId_productId: { distributorId: body.distributorId, productId: line.productId } },
        });
        const currentQty = balance?.qty ?? 0;
        if (currentQty < line.qty) {
          throw new ApiError(400, `Insufficient stock for product ${line.productId} at this distributor`);
        }
        const amount = line.qty * line.unitPrice;
        totalAmount += amount;
        itemsData.push({ productId: line.productId, qty: line.qty, unitPrice: line.unitPrice, amount });
      }

      const orderNumber = `SO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const created = await tx.order.create({
        data: {
          orderNumber,
          retailerId: body.retailerId,
          obUserId,
          distributorId: body.distributorId,
          totalAmount,
          madeProductive,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      for (const line of itemsData) {
        const balance = await tx.distributorStockBalance.update({
          where: { distributorId_productId: { distributorId: body.distributorId, productId: line.productId } },
          data: { qty: { decrement: line.qty } },
        });
        await tx.stockLedgerEntry.create({
          data: {
            distributorId: body.distributorId,
            productId: line.productId,
            type: 'OUTBOUND_SECONDARY',
            qty: -line.qty,
            refType: 'Order',
            refId: created.id,
            balanceAfter: balance.qty,
          },
        });
      }

      await tx.retailer.update({
        where: { id: body.retailerId },
        data: { status: 'PRODUCTIVE', lastOrderDate: new Date() },
      });

      return created;
    });

    const full = await prisma.order.findUnique({
      where: { id: order.id },
      include: { retailer: true, obUser: true, distributor: true, items: { include: { product: { include: { family: true } } } } },
    });
    res.status(201).json(full);
  })
);

export default router;
