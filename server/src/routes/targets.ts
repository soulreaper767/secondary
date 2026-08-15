import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { userId, periodMonth, periodYear } = req.query;
    const where: any = {};
    if (userId) where.userId = Number(userId);
    if (periodMonth) where.periodMonth = Number(periodMonth);
    if (periodYear) where.periodYear = Number(periodYear);
    const targets = await prisma.target.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: { select: { code: true } } } } },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
    res.json(targets);
  })
);

const targetSchema = z.object({
  userId: z.number(),
  periodMonth: z.number().min(1).max(12),
  periodYear: z.number(),
  targetType: z.enum(['VALUE', 'VOLUME']).optional(),
  targetValue: z.number().positive(),
});

router.post(
  '/',
  requireRole('ADMIN', 'CSO', 'GM', 'RM', 'UM', 'AM'),
  asyncHandler(async (req, res) => {
    const body = targetSchema.parse(req.body);
    const target = await prisma.target.upsert({
      where: { userId_periodMonth_periodYear: { userId: body.userId, periodMonth: body.periodMonth, periodYear: body.periodYear } },
      create: body,
      update: { targetValue: body.targetValue, targetType: body.targetType },
    });
    res.status(201).json(target);
  })
);

export default router;
