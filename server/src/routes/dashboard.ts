import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { scopeToTerritory } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';
import { getUniverseSummary, getSubtreeNodeIds } from '../lib/territory';

const router = Router();
router.use(requireAuth);
router.use(scopeToTerritory);

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const nodeIds = req.scopedNodeIds ?? null;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const universe = await getUniverseSummary(nodeIds);

    const orderWhere: any = { orderDate: { gte: monthStart }, status: { not: 'CANCELLED' } };
    if (nodeIds) orderWhere.retailer = { territoryNodeId: { in: nodeIds } };
    const [mtdAgg, newProductiveCount, casesAgg] = await Promise.all([
      prisma.order.aggregate({ where: orderWhere, _sum: { totalAmount: true }, _count: { _all: true } }),
      prisma.order.count({ where: { ...orderWhere, madeProductive: true } }),
      prisma.orderItem.aggregate({ where: { order: orderWhere }, _sum: { qty: true } }),
    ]);
    const repeatAgg = await prisma.order.aggregate({
      where: { ...orderWhere, madeProductive: false },
      _sum: { totalAmount: true },
    });

    const distributorWhere: any = nodeIds ? { territoryNodeId: { in: nodeIds } } : {};
    const distributorCount = await prisma.distributor.count({ where: distributorWhere });

    const target = await prisma.target.findUnique({
      where: { userId_periodMonth_periodYear: { userId: user.id, periodMonth: now.getMonth() + 1, periodYear: now.getFullYear() } },
    });
    const earnings = await prisma.incentiveEarning.findMany({
      where: { userId: user.id, periodMonth: now.getMonth() + 1, periodYear: now.getFullYear() },
      include: { scheme: true },
    });
    const totalIncentive = earnings.reduce((s, e) => s + e.incentiveAmount, 0);

    const unreadNotifications = await prisma.notification.count({ where: { userId: user.id, isRead: false } });

    // Direct-report leaderboard (managers only)
    const reports = await prisma.user.findMany({ where: { managerId: user.id }, select: { id: true, name: true, territoryNodeId: true, role: { select: { code: true } } } });
    let leaderboard: any[] = [];
    if (reports.length > 0) {
      leaderboard = await Promise.all(
        reports.map(async (r) => {
          const rNodeIds = r.territoryNodeId ? await getSubtreeNodeIds(r.territoryNodeId) : [];
          const where: any = { orderDate: { gte: monthStart }, status: { not: 'CANCELLED' } };
          if (rNodeIds.length) where.retailer = { territoryNodeId: { in: rNodeIds } };
          else where.obUserId = r.id;
          const agg = await prisma.order.aggregate({ where, _sum: { totalAmount: true } });
          return { id: r.id, name: r.name, role: r.role.code, mtdSales: agg._sum.totalAmount || 0 };
        })
      );
      leaderboard.sort((a, b) => b.mtdSales - a.mtdSales);
    }

    let pjpCompliance: { planned: number; visited: number; compliancePct: number } | null = null;
    if (user.role.code === 'OB') {
      const from = new Date(new Date().setDate(new Date().getDate() - 30));
      const visits = await prisma.visit.findMany({ where: { obUserId: user.id, plannedDate: { gte: from } } });
      const planned = visits.length;
      const visited = visits.filter((v) => v.visitStatus === 'VISITED').length;
      pjpCompliance = { planned, visited, compliancePct: planned > 0 ? (visited / planned) * 100 : 0 };
    }

    res.json({
      universe,
      mtdSalesValue: mtdAgg._sum.totalAmount || 0,
      mtdOrderCount: mtdAgg._count._all,
      newVsRepeat: {
        newValue: (mtdAgg._sum.totalAmount || 0) - (repeatAgg._sum.totalAmount || 0),
        repeatValue: repeatAgg._sum.totalAmount || 0,
        newShopCount: newProductiveCount,
      },
      casesSoldMtd: casesAgg._sum.qty || 0,
      distributorCount,
      target: target ? { targetValue: target.targetValue, achievedValue: mtdAgg._sum.totalAmount || 0 } : null,
      incentive: earnings.length ? { incentiveAmount: totalIncentive, schemes: earnings.map((e) => ({ name: e.scheme.name, amount: e.incentiveAmount, metricValue: e.metricValue })) } : null,
      unreadNotifications,
      leaderboard,
      pjpCompliance,
    });
  })
);

export default router;
