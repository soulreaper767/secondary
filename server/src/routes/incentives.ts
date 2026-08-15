import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';
import { computeIncentiveForUser } from '../lib/incentives';

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
  basis: z.enum(['SLAB_ON_ACHIEVEMENT', 'PERCENT_OF_SALES']),
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
