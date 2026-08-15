import { prisma } from './prisma';
import { resolveScopedNodeIds } from './territory';

interface PercentRules {
  percent: number;
}
interface SlabRules {
  slabs: { minPct: number; maxPct: number; amount: number }[];
}
interface PerCaseRules {
  ratePerCase: number;
}
interface PerNewShopRules {
  ratePerShop: number;
}

type PeriodUser = { id: number; territoryNodeId: number | null; role: { code: string } };

function monthRange(periodMonth: number, periodYear: number) {
  return { from: new Date(periodYear, periodMonth - 1, 1), to: new Date(periodYear, periodMonth, 1) };
}

/** Builds the order/user scope filter shared by every period metric below. */
async function scopeFilter(user: PeriodUser) {
  if (user.role.code === 'OB') return { obUserId: user.id };
  const nodeIds = await resolveScopedNodeIds(user);
  return nodeIds ? { retailer: { territoryNodeId: { in: nodeIds } } } : {};
}

/** Total secondary sales value booked within a user's territory scope for a period. */
export async function getAchievedValue(user: PeriodUser, periodMonth: number, periodYear: number): Promise<number> {
  const { from, to } = monthRange(periodMonth, periodYear);
  const scope = await scopeFilter(user);
  const agg = await prisma.order.aggregate({
    where: { ...scope, orderDate: { gte: from, lt: to }, status: { not: 'CANCELLED' } },
    _sum: { totalAmount: true },
  });
  return agg._sum.totalAmount || 0;
}

/** Total cases/units sold (sum of order-line qty) within scope for a period. */
export async function getCasesSold(user: PeriodUser, periodMonth: number, periodYear: number): Promise<number> {
  const { from, to } = monthRange(periodMonth, periodYear);
  const scope = await scopeFilter(user);
  const agg = await prisma.orderItem.aggregate({
    where: { order: { ...scope, orderDate: { gte: from, lt: to }, status: { not: 'CANCELLED' } } },
    _sum: { qty: true },
  });
  return agg._sum.qty || 0;
}

/** Count of orders that converted a shop into Productive (first order, or a reactivation) within scope for a period. */
export async function getNewProductiveShopCount(user: PeriodUser, periodMonth: number, periodYear: number): Promise<number> {
  const { from, to } = monthRange(periodMonth, periodYear);
  const scope = await scopeFilter(user);
  return prisma.order.count({
    where: { ...scope, orderDate: { gte: from, lt: to }, status: { not: 'CANCELLED' }, madeProductive: true },
  });
}

function computeAmountFromRules(
  basis: string,
  rulesJson: string,
  metrics: { achievedValue: number; achievementPct: number; casesSold: number; newProductiveShops: number }
): { amount: number; metricValue: number | null } {
  const rules = JSON.parse(rulesJson);
  if (basis === 'PERCENT_OF_SALES') {
    const { percent } = rules as PercentRules;
    return { amount: Math.round(metrics.achievedValue * (percent / 100)), metricValue: null };
  }
  if (basis === 'SLAB_ON_ACHIEVEMENT') {
    const { slabs } = rules as SlabRules;
    const slab = slabs.find((s) => metrics.achievementPct >= s.minPct && metrics.achievementPct < s.maxPct);
    return { amount: slab ? slab.amount : 0, metricValue: null };
  }
  if (basis === 'PER_CASE_SOLD') {
    const { ratePerCase } = rules as PerCaseRules;
    return { amount: Math.round(metrics.casesSold * ratePerCase), metricValue: metrics.casesSold };
  }
  if (basis === 'PER_NEW_PRODUCTIVE_SHOP') {
    const { ratePerShop } = rules as PerNewShopRules;
    return { amount: Math.round(metrics.newProductiveShops * ratePerShop), metricValue: metrics.newProductiveShops };
  }
  return { amount: 0, metricValue: null };
}

/**
 * Computes and stores incentive earnings for a user for a period, across
 * every active scheme assigned to their role (a role can stack a base
 * value-% scheme with a volume kicker and/or a new-outlet bonus).
 */
export async function computeIncentiveForUser(userId: number, periodMonth: number, periodYear: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user) throw new Error('User not found');

  const schemes = await prisma.incentiveScheme.findMany({ where: { roleId: user.roleId, active: true } });
  if (schemes.length === 0) return [];

  const target = await prisma.target.findUnique({
    where: { userId_periodMonth_periodYear: { userId, periodMonth, periodYear } },
  });
  const targetValue = target?.targetValue || 0;

  const [achievedValue, casesSold, newProductiveShops] = await Promise.all([
    getAchievedValue(user, periodMonth, periodYear),
    getCasesSold(user, periodMonth, periodYear),
    getNewProductiveShopCount(user, periodMonth, periodYear),
  ]);
  const achievementPct = targetValue > 0 ? (achievedValue / targetValue) * 100 : 0;

  const results = [];
  for (const scheme of schemes) {
    const { amount, metricValue } = computeAmountFromRules(scheme.basis, scheme.rulesJson, {
      achievedValue,
      achievementPct,
      casesSold,
      newProductiveShops,
    });
    const earning = await prisma.incentiveEarning.upsert({
      where: { userId_schemeId_periodMonth_periodYear: { userId, schemeId: scheme.id, periodMonth, periodYear } },
      create: { userId, schemeId: scheme.id, periodMonth, periodYear, achievedValue, targetValue, achievementPct, incentiveAmount: amount, metricValue },
      update: { achievedValue, targetValue, achievementPct, incentiveAmount: amount, metricValue },
    });
    results.push(earning);
  }
  return results;
}
