import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { obUserId } = req.query;
    const where: any = {};
    if (obUserId) where.obUserId = Number(obUserId);
    else if (req.user!.role.code === 'OB') where.obUserId = req.user!.id;
    const pjps = await prisma.pJP.findMany({
      where,
      include: { entries: { include: { retailer: true } }, obUser: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(pjps);
  })
);

const pjpSchema = z.object({
  name: z.string().min(1),
  obUserId: z.number(),
  entries: z.array(z.object({ retailerId: z.number(), dayOfWeek: z.number().min(0).max(6) })),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = pjpSchema.parse(req.body);
    const pjp = await prisma.pJP.create({
      data: {
        name: body.name,
        obUserId: body.obUserId,
        entries: { create: body.entries },
      },
      include: { entries: { include: { retailer: true } } },
    });
    res.status(201).json(pjp);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = pjpSchema.partial({ entries: true }).parse(req.body);
    const id = Number(req.params.id);
    if (body.entries) {
      await prisma.pJPVisitPlan.deleteMany({ where: { pjpId: id } });
      await prisma.pJPVisitPlan.createMany({ data: body.entries.map((e) => ({ ...e, pjpId: id })) });
    }
    const pjp = await prisma.pJP.update({
      where: { id },
      data: { name: body.name, active: (body as any).active },
      include: { entries: { include: { retailer: true } } },
    });
    res.json(pjp);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.pJP.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

export default router;
