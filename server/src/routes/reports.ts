import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { scopeToTerritory } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';
import { getUniverseSummary } from '../lib/territory';
import { variantDisplayName } from '../lib/product';
import { buildExcelBuffer, buildPdfBuffer, ExportSpec } from '../lib/export';

const router = Router();
router.use(requireAuth);
router.use(scopeToTerritory);

/** If ?format=xlsx|pdf is present, streams the file and returns true; otherwise returns false (caller sends JSON as normal). */
async function maybeExport(req: any, res: any, spec: ExportSpec): Promise<boolean> {
  const format = String(req.query.format || '');
  if (format !== 'xlsx' && format !== 'pdf') return false;
  const filename = `${spec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}`;
  spec.generatedBy = req.user ? `${req.user.name} (${req.user.role.name})` : undefined;
  if (format === 'xlsx') {
    const buffer = await buildExcelBuffer(spec);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.send(buffer);
  } else {
    const buffer = await buildPdfBuffer(spec);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    res.send(buffer);
  }
  return true;
}

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
    const totalQty = rows.reduce((s, r) => s + r.qty, 0);
    const newValue = orders.filter((o) => o.madeProductive).reduce((s, o) => s + o.totalAmount, 0);

    const exported = await maybeExport(req, res, {
      title: 'Secondary Sales Report',
      subtitle: `Grouped by ${groupBy}`,
      meta: [
        { label: 'Period', value: `${from.toLocaleDateString()} – ${to.toLocaleDateString()}` },
        { label: 'Total orders', value: String(orders.length) },
      ],
      columns: [
        { header: groupBy.charAt(0).toUpperCase() + groupBy.slice(1), key: 'label', width: 32 },
        { header: 'Orders', key: 'orders', align: 'right', format: 'number', width: 12 },
        { header: 'Qty', key: 'qty', align: 'right', format: 'number', width: 12 },
        { header: 'Value', key: 'value', align: 'right', format: 'currency', width: 16 },
      ],
      rows,
      totals: { label: 'Total', orders: orders.length, qty: totalQty, value: totalValue },
    });
    if (exported) return;

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

    const exportRows = rows.flatMap((r) =>
      r.items.map((i) => ({ retailerName: r.retailerName, category: r.category, territory: r.territory, sku: `${i.name} ${i.packSize}`, qty: i.qty, takenAt: new Date(r.takenAt).toLocaleDateString() }))
    );
    const exported = await maybeExport(req, res, {
      title: 'Shop Stock Report',
      subtitle: 'Shelf stock physically counted by the order booker on the most recent visit',
      meta: [{ label: 'Shops counted', value: String(rows.length) }],
      columns: [
        { header: 'Shop', key: 'retailerName', width: 26 },
        { header: 'Category', key: 'category', width: 16 },
        { header: 'Territory', key: 'territory', width: 26 },
        { header: 'SKU', key: 'sku', width: 22 },
        { header: 'Qty', key: 'qty', align: 'right', format: 'number', width: 10 },
        { header: 'Counted On', key: 'takenAt', width: 14 },
      ],
      rows: exportRows,
    });
    if (exported) return;

    res.json(rows);
  })
);

router.get(
  '/universe-funnel',
  asyncHandler(async (req, res) => {
    const nodeIds = req.scopedNodeIds ?? null;
    const summary = await getUniverseSummary(nodeIds);

    const exported = await maybeExport(req, res, {
      title: 'Universe Funnel Report',
      subtitle: 'Untapped → Covered → Productive / Non-Productive',
      columns: [
        { header: 'Stage', key: 'label', width: 22 },
        { header: 'Count', key: 'count', align: 'right', format: 'number', width: 12 },
        { header: '% of Universe', key: 'pct', align: 'right', format: 'percent', width: 14 },
      ],
      rows: [
        { label: 'Total Universe', count: summary.total, pct: 100 },
        { label: 'Untapped', count: summary.untapped, pct: summary.total ? (summary.untapped / summary.total) * 100 : 0 },
        { label: 'Covered (Productive + Non-Productive)', count: summary.covered, pct: summary.total ? (summary.covered / summary.total) * 100 : 0 },
        { label: '  Productive', count: summary.productive, pct: summary.total ? (summary.productive / summary.total) * 100 : 0 },
        { label: '  Non-Productive', count: summary.nonProductive, pct: summary.total ? (summary.nonProductive / summary.total) * 100 : 0 },
      ],
    });
    if (exported) return;

    res.json(summary);
  })
);

const CATEGORY_LABEL: Record<string, string> = {
  GENERAL_STORE: 'General Store',
  PAN_SHOP: 'Pan Shop',
  KIRYANA_STORE: 'Kiryana Store',
  LARGE_STORE: 'Large Store',
  WHOLESALE: 'Wholesale',
  HORECA: 'HoReCa',
  MODERN_TRADE: 'Modern Trade',
};
const CHILLER_LABEL: Record<string, string> = {
  NONE: 'No Chiller',
  COMPANY: 'Company Chiller',
  COMPETITOR: 'Competitor Chiller',
  SHOP_OWNED: "Shop's Own Chiller",
};

// Shop-type / chiller / brand-presence breakdown of the universe in scope —
// the segmentation dimensions that sit alongside the untapped/covered funnel.
router.get(
  '/universe-segmentation',
  asyncHandler(async (req, res) => {
    const where: any = {};
    if (req.scopedNodeIds) where.territoryNodeId = { in: req.scopedNodeIds };

    const [byCategory, byChiller, exclusiveCount, total] = await Promise.all([
      prisma.retailer.groupBy({ by: ['category'], where, _count: { _all: true } }),
      prisma.retailer.groupBy({ by: ['chillerType'], where, _count: { _all: true } }),
      prisma.retailer.count({ where: { ...where, competitorExclusive: true } }),
      prisma.retailer.count({ where }),
    ]);

    const byCategoryRows = byCategory.map((r) => ({ key: r.category, count: r._count._all })).sort((a, b) => b.count - a.count);
    const byChillerRows = byChiller.map((r) => ({ key: r.chillerType, count: r._count._all })).sort((a, b) => b.count - a.count);

    const exported = await maybeExport(req, res, {
      title: 'Universe Segmentation Report',
      subtitle: 'Shop type, chiller placement, and brand exclusivity across the recorded universe',
      meta: [{ label: 'Total shops', value: String(total) }, { label: 'Competitor-exclusive', value: String(exclusiveCount) }],
      columns: [
        { header: 'Dimension', key: 'dimension', width: 16 },
        { header: 'Segment', key: 'segment', width: 24 },
        { header: 'Count', key: 'count', align: 'right', format: 'number', width: 12 },
        { header: '% of Universe', key: 'pct', align: 'right', format: 'percent', width: 14 },
      ],
      rows: [
        ...byCategoryRows.map((r) => ({ dimension: 'Shop Type', segment: CATEGORY_LABEL[r.key] || r.key, count: r.count, pct: total ? (r.count / total) * 100 : 0 })),
        ...byChillerRows.map((r) => ({ dimension: 'Chiller Status', segment: CHILLER_LABEL[r.key] || r.key, count: r.count, pct: total ? (r.count / total) * 100 : 0 })),
        { dimension: 'Brand Presence', segment: 'Competitor-exclusive', count: exclusiveCount, pct: total ? (exclusiveCount / total) * 100 : 0 },
      ],
    });
    if (exported) return;

    res.json({
      total,
      byCategory: byCategoryRows,
      byChiller: byChillerRows,
      competitorExclusive: exclusiveCount,
    });
  })
);

// Territory-wise recorded universe vs estimated true market potential —
// ranked by the biggest expansion gap, so management knows where to focus
// (more shops to add) versus where the market is already mostly captured.
router.get(
  '/coverage-opportunity',
  asyncHandler(async (req, res) => {
    const where: any = { level: 'TERRITORY' };
    if (req.scopedNodeIds) where.id = { in: req.scopedNodeIds };
    const territories = await prisma.territoryNode.findMany({ where, orderBy: { path: 'asc' } });

    const rows = await Promise.all(
      territories.map(async (t) => {
        const [total, untapped, productive] = await Promise.all([
          prisma.retailer.count({ where: { territoryNodeId: t.id } }),
          prisma.retailer.count({ where: { territoryNodeId: t.id, status: 'UNTAPPED' } }),
          prisma.retailer.count({ where: { territoryNodeId: t.id, status: 'PRODUCTIVE' } }),
        ]);
        const gap = Math.max(0, t.marketPotential - total);
        return {
          territoryId: t.id,
          territoryName: t.name,
          marketPotential: t.marketPotential,
          recordedUniverse: total,
          untappedInSystem: untapped,
          productive,
          penetrationPct: t.marketPotential > 0 ? (total / t.marketPotential) * 100 : null,
          expansionGap: gap,
        };
      })
    );

    rows.sort((a, b) => b.expansionGap - a.expansionGap);

    const exported = await maybeExport(req, res, {
      title: 'Coverage Opportunity Report',
      subtitle: 'Recorded universe vs. estimated true market potential, ranked by expansion gap',
      columns: [
        { header: 'Territory', key: 'territoryName', width: 30 },
        { header: 'Market Potential', key: 'marketPotential', align: 'right', format: 'number', width: 16 },
        { header: 'Recorded Universe', key: 'recordedUniverse', align: 'right', format: 'number', width: 16 },
        { header: 'Untapped (in system)', key: 'untappedInSystem', align: 'right', format: 'number', width: 18 },
        { header: 'Productive', key: 'productive', align: 'right', format: 'number', width: 12 },
        { header: 'Penetration %', key: 'penetrationPct', align: 'right', format: 'percent', width: 14 },
        { header: 'Expansion Gap', key: 'expansionGap', align: 'right', format: 'number', width: 14 },
      ],
      rows,
    });
    if (exported) return;

    res.json(rows);
  })
);

// Per order-booker field efficiency: route size, daily coverage, compliance,
// and the untapped opportunity still sitting in their own territory —
// surfaces who's overloaded/underloaded and where extra OBs would help.
router.get(
  '/ob-efficiency',
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days || 30);
    const from = new Date();
    from.setDate(from.getDate() - days);

    const where: any = { role: { code: 'OB' } };
    if (req.scopedNodeIds) where.territoryNodeId = { in: req.scopedNodeIds };
    const obs = await prisma.user.findMany({ where, include: { territoryNode: true } });

    const rows = await Promise.all(
      obs.map(async (ob) => {
        const [routeSize, visits, universe, orders] = await Promise.all([
          prisma.pJPVisitPlan.count({ where: { pjp: { obUserId: ob.id, active: true } } }),
          prisma.visit.findMany({ where: { obUserId: ob.id, plannedDate: { gte: from } }, select: { visitStatus: true } }),
          ob.territoryNodeId
            ? prisma.retailer.groupBy({ by: ['status'], where: { territoryNodeId: ob.territoryNodeId }, _count: { _all: true } })
            : Promise.resolve([]),
          prisma.order.count({ where: { obUserId: ob.id, orderDate: { gte: from } } }),
        ]);

        const planned = visits.length;
        const visited = visits.filter((v) => v.visitStatus === 'VISITED').length;
        const universeCounts = { total: 0, untapped: 0, productive: 0, nonProductive: 0 };
        for (const row of universe as { status: string; _count: { _all: number } }[]) {
          universeCounts.total += row._count._all;
          if (row.status === 'UNTAPPED') universeCounts.untapped = row._count._all;
          if (row.status === 'PRODUCTIVE') universeCounts.productive = row._count._all;
          if (row.status === 'NON_PRODUCTIVE') universeCounts.nonProductive = row._count._all;
        }

        return {
          obId: ob.id,
          obName: ob.name,
          territory: ob.territoryNode?.name,
          routeSize,
          plannedVisits: planned,
          actualVisits: visited,
          compliancePct: planned > 0 ? (visited / planned) * 100 : 0,
          avgVisitsPerDay: days > 0 ? visited / days : 0,
          ordersBooked: orders,
          untappedInTerritory: universeCounts.untapped,
          universeInTerritory: universeCounts.total,
        };
      })
    );

    rows.sort((a, b) => b.untappedInTerritory - a.untappedInTerritory);

    const exported = await maybeExport(req, res, {
      title: 'OB Efficiency Report',
      subtitle: `Field coverage over the last ${days} days`,
      columns: [
        { header: 'Order Booker', key: 'obName', width: 22 },
        { header: 'Territory', key: 'territory', width: 26 },
        { header: 'Route Size', key: 'routeSize', align: 'right', format: 'number', width: 12 },
        { header: 'Planned Visits', key: 'plannedVisits', align: 'right', format: 'number', width: 14 },
        { header: 'Actual Visits', key: 'actualVisits', align: 'right', format: 'number', width: 14 },
        { header: 'Compliance %', key: 'compliancePct', align: 'right', format: 'percent', width: 14 },
        { header: 'Avg Visits/Day', key: 'avgVisitsPerDay', align: 'right', format: 'number', width: 14 },
        { header: 'Orders Booked', key: 'ordersBooked', align: 'right', format: 'number', width: 14 },
        { header: 'Untapped in Territory', key: 'untappedInTerritory', align: 'right', format: 'number', width: 18 },
      ],
      rows: rows.map((r) => ({ ...r, avgVisitsPerDay: Math.round(r.avgVisitsPerDay * 10) / 10 })),
    });
    if (exported) return;

    res.json({ days, rows });
  })
);

export default router;
