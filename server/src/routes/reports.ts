import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { scopeToTerritory } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';
import { getUniverseSummary } from '../lib/territory';
import { variantDisplayName } from '../lib/product';

const router = Router();
router.use(requireAuth);
router.use(scopeToTerritory);

function dateRange(req: any) {
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const from = req.query.from
    ? new Date(String(req.query.from))
    : new Date(new Date().setDate(new Date().getDate() - 30));
  return { from, to };
}

router.get(
  '/secondary-sales',
  asyncHandler(async (req, res) => {
    const { from, to } = dateRange(req);
    const groupBy = String(req.query.groupBy || 'distributor');

    const where: any = { orderDate: { gte: from, lte: to }, status: { not: 'CANCELLED' } };
    if (req.scopedNodeIds) where.retailer = { territoryNodeId: { in: req.scopedNodeIds } };

    const orders = await prisma.order.findMany({
      where,
      include: {
        distributor: { select: { id: true, name: true } },
        obUser: { select: { id: true, name: true } },
        retailer: { select: { id: true, name: true, territoryNodeId: true, territoryNode: { select: { name: true } } } },
        items: { include: { product: { include: { family: true } } } },
      },
    });

    const buckets = new Map<string, { key: string; label: string; orders: number; value: number; qty: number }>();
    for (const order of orders) {
      let entries: { key: string; label: string }[] = [];
      if (groupBy === 'distributor') entries = [{ key: String(order.distributorId), label: order.distributor.name }];
      else if (groupBy === 'obUser') entries = [{ key: String(order.obUserId), label: order.obUser.name }];
      else if (groupBy === 'territory')
        entries = [{ key: String(order.retailer.territoryNodeId), label: order.retailer.territoryNode.name }];
      else if (groupBy === 'sku')
        entries = order.items.map((i) => ({ key: String(i.productId), label: variantDisplayName(i.product) }));

      for (const entry of entries) {
        if (!buckets.has(entry.key)) buckets.set(entry.key, { key: entry.key, label: entry.label, orders: 0, value: 0, qty: 0 });
        const bucket = buckets.get(entry.key)!;
        bucket.orders += 1;
        if (groupBy === 'sku') {
          const item = order.items.find((i) => String(i.productId) === entry.key);
          bucket.value += item?.amount || 0;
          bucket.qty += item?.qty || 0;
        } else {
          bucket.value += order.totalAmount;
        }
      }
    }

    const rows = Array.from(buckets.values()).sort((a, b) => b.value - a.value);
    const totalValue = rows.reduce((s, r) => s + r.value, 0);
    const newValue = orders.filter((o) => o.madeProductive).reduce((s, o) => s + o.totalAmount, 0);
    res.json({
      groupBy,
      from,
      to,
      totalValue,
      totalOrders: orders.length,
      rows,
      newVsRepeat: { newValue, repeatValue: totalValue - newValue, newOrders: orders.filter((o) => o.madeProductive).length, repeatOrders: orders.filter((o) => !o.madeProductive).length },
    });
  })
);

router.get(
  '/secondary-sales/trend',
  asyncHandler(async (req, res) => {
    const { from, to } = dateRange(req);
    const where: any = { orderDate: { gte: from, lte: to }, status: { not: 'CANCELLED' } };
    if (req.scopedNodeIds) where.retailer = { territoryNodeId: { in: req.scopedNodeIds } };
    const orders = await prisma.order.findMany({ where, select: { orderDate: true, totalAmount: true } });

    const byDay = new Map<string, number>();
    for (const o of orders) {
      const key = o.orderDate.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + o.totalAmount);
    }
    const rows = Array.from(byDay.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
    res.json(rows);
  })
);

// Latest known stock at each shop/wholesaler/customer, as physically
// counted by the order booker on their most recent visit — independent of
// (and a sanity check against) the distributor sales ledger.
router.get(
  '/shop-stock',
  asyncHandler(async (req, res) => {
    const where: any = {};
    if (req.scopedNodeIds) where.retailer = { territoryNodeId: { in: req.scopedNodeIds } };
    if (req.query.retailerId) where.retailerId = Number(req.query.retailerId);

    const takes = await prisma.stockTake.findMany({
      where,
      include: {
        retailer: { select: { id: true, name: true, category: true, territoryNode: { select: { name: true } } } },
        items: { include: { product: { include: { family: true } } } },
      },
      orderBy: { takenAt: 'desc' },
    });

    // Keep only the most recent stock-take per retailer.
    const latestByRetailer = new Map<number, (typeof takes)[number]>();
    for (const t of takes) {
      if (!latestByRetailer.has(t.retailerId)) latestByRetailer.set(t.retailerId, t);
    }

    const rows = Array.from(latestByRetailer.values()).map((t) => ({
      retailerId: t.retailerId,
      retailerName: t.retailer.name,
      category: t.retailer.category,
      territory: t.retailer.territoryNode?.name,
      takenAt: t.takenAt,
      items: t.items.map((i) => ({ productId: i.productId, name: `${i.product.family.name} ${i.product.packaging}`, skuCode: i.product.skuCode, packSize: i.product.size, qty: i.qty })),
      totalUnits: t.items.reduce((s, i) => s + i.qty, 0),
    }));

    res.json(rows);
  })
);

router.get(
  '/universe-funnel',
  asyncHandler(async (req, res) => {
    const nodeIds = req.scopedNodeIds ?? null;
    const summary = await getUniverseSummary(nodeIds);
    res.json(summary);
  })
);

export default router;
