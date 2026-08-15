import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';
import { computeIncentiveForUser } from '../lib/incentives';
import { buildExcelBuffer, buildPdfBuffer } from '../lib/export';

const BASIS_LABEL: Record<string, string> = {
  PERCENT_OF_SALES: '% of Sales',
  SLAB_ON_ACHIEVEMENT: 'Achievement Slab',
  PER_CASE_SOLD: 'Per Case Sold',
  PER_NEW_PRODUCTIVE_SHOP: 'Per New Shop',
};
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const router = Router();
router.use(requireAuth);

router.get(
  '/schemes',
  asyncHandler(async (_req, res) => {
    const schemes = await prisma.incentiveScheme.findMany({ include: { role: true }, orderBy: { id: 'asc' } });
    res.json(schemes);
  })
);

const schemeSchema = z.object({
  name: z.string().min(1),
  roleId: z.number(),
  basis: z.enum(['SLAB_ON_ACHIEVEMENT', 'PERCENT_OF_SALES', 'PER_CASE_SOLD', 'PER_NEW_PRODUCTIVE_SHOP']),
  rulesJson: z.string(),
  active: z.boolean().optional(),
});

router.post(
  '/schemes',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = schemeSchema.parse(req.body);
    const scheme = await prisma.incentiveScheme.create({ data: body });
    res.status(201).json(scheme);
  })
);

router.put(
  '/schemes/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = schemeSchema.partial().parse(req.body);
    const scheme = await prisma.incentiveScheme.update({ where: { id: Number(req.params.id) }, data: body });
    res.json(scheme);
  })
);

router.get(
  '/earnings',
  asyncHandler(async (req, res) => {
    const { userId, periodMonth, periodYear } = req.query;
    const where: any = {};
    if (userId) where.userId = Number(userId);
    else where.userId = req.user!.id;
    if (periodMonth) where.periodMonth = Number(periodMonth);
    if (periodYear) where.periodYear = Number(periodYear);
    const earnings = await prisma.incentiveEarning.findMany({
      where,
      include: { scheme: true, user: { select: { id: true, name: true } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    const format = String(req.query.format || '');
    if (format === 'xlsx' || format === 'pdf') {
      const exportRows = earnings.map((e) => ({
        user: e.user.name,
        period: `${MONTHS[e.periodMonth]} ${e.periodYear}`,
        scheme: e.scheme.name,
        basis: BASIS_LABEL[e.scheme.basis] || e.scheme.basis,
        target: e.targetValue,
        achieved: e.achievedValue,
        achievementPct: e.achievementPct,
        incentive: e.incentiveAmount,
      }));
      const totalIncentive = earnings.reduce((s, e) => s + e.incentiveAmount, 0);
      const spec = {
        title: 'Incentive Earnings Report',
        subtitle: userId ? undefined : 'All schemes, current scope',
        generatedBy: req.user ? `${req.user.name} (${req.user.role.name})` : undefined,
        columns: [
          { header: 'User', key: 'user', width: 20 },
          { header: 'Period', key: 'period', width: 12 },
          { header: 'Scheme', key: 'scheme', width: 24 },
          { header: 'Basis', key: 'basis', width: 16 },
          { header: 'Target', key: 'target', align: 'right' as const, format: 'currency' as const, width: 16 },
          { header: 'Achieved', key: 'achieved', align: 'right' as const, format: 'currency' as const, width: 16 },
          { header: 'Achv %', key: 'achievementPct', align: 'right' as const, format: 'percent' as const, width: 10 },
          { header: 'Incentive', key: 'incentive', align: 'right' as const, format: 'currency' as const, width: 14 },
        ],
        rows: exportRows,
        totals: { user: 'Total', incentive: totalIncentive },
      };
      const filename = `incentive-earnings-${new Date().toISOString().slice(0, 10)}`;
      if (format === 'xlsx') {
        const buffer = await buildExcelBuffer(spec);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        return res.send(buffer);
      } else {
        const buffer = await buildPdfBuffer(spec);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        return res.send(buffer);
      }
    }

    res.json(earnings);
  })
);

router.post(
  '/compute',
  asyncHandler(async (req, res) => {
    const body = z.object({ userId: z.number(), periodMonth: z.number(), periodYear: z.number() }).parse(req.body);
    const result = await computeIncentiveForUser(body.userId, body.periodMonth, body.periodYear);
    res.json(result);
  })
);

export default router;
