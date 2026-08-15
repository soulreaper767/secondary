import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

function dayStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function dayEnd(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Ensures today's (or a given date's) Visit rows exist for an OB, generated from their active PJPs. */
async function ensureRoutePlanForDate(obUserId: number, date: Date) {
  const dow = date.getDay();
  const existing = await prisma.visit.findMany({
    where: { obUserId, plannedDate: { gte: dayStart(date), lte: dayEnd(date) } },
  });
  if (existing.length > 0) return existing;

  const entries = await prisma.pJPVisitPlan.findMany({
    where: { dayOfWeek: dow, pjp: { obUserId, active: true } },
    select: { retailerId: true },
  });
  if (entries.length === 0) return [];

  await prisma.visit.createMany({
    data: entries.map((e) => ({ obUserId, retailerId: e.retailerId, plannedDate: dayStart(date) })),
  });
  return prisma.visit.findMany({ where: { obUserId, plannedDate: { gte: dayStart(date), lte: dayEnd(date) } } });
}

router.get(
  '/today',
  asyncHandler(async (req, res) => {
    const obUserId = req.query.obUserId ? Number(req.query.obUserId) : req.user!.id;
    const date = req.query.date ? new Date(String(req.query.date)) : new Date();
    await ensureRoutePlanForDate(obUserId, date);
    const visits = await prisma.visit.findMany({
      where: { obUserId, plannedDate: { gte: dayStart(date), lte: dayEnd(date) } },
      include: { retailer: true },
      orderBy: { id: 'asc' },
    });
    res.json(visits);
  })
);

router.get(
  '/compliance',
  asyncHandler(async (req, res) => {
    const obUserId = req.query.obUserId ? Number(req.query.obUserId) : req.user!.id;
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().setDate(new Date().getDate() - 30));
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const visits = await prisma.visit.findMany({ where: { obUserId, plannedDate: { gte: from, lte: to } } });
    const planned = visits.length;
    const visited = visits.filter((v) => v.visitStatus === 'VISITED').length;
    const skipped = visits.filter((v) => v.visitStatus === 'SKIPPED').length;
    res.json({ planned, visited, skipped, compliancePct: planned > 0 ? (visited / planned) * 100 : 0 });
  })
);

router.post(
  '/:id/checkin',
  asyncHandler(async (req, res) => {
    const visit = await prisma.visit.update({
      where: { id: Number(req.params.id) },
      data: { checkInTime: new Date(), visitStatus: 'VISITED' },
    });
    const retailer = await prisma.retailer.findUnique({ where: { id: visit.retailerId } });
    if (retailer && retailer.status === 'UNTAPPED') {
      await prisma.retailer.update({ where: { id: retailer.id }, data: { status: 'COVERED' } });
    }
    if (retailer) {
      await prisma.retailer.update({ where: { id: retailer.id }, data: { lastVisitDate: new Date() } });
    }
    res.json(visit);
  })
);

const outcomeSchema = z.object({
  outcome: z.enum(['ORDER_TAKEN', 'NO_ORDER', 'CLOSED', 'NOT_INTERESTED']),
  remarks: z.string().optional(),
});

router.post(
  '/:id/outcome',
  asyncHandler(async (req, res) => {
    const body = outcomeSchema.parse(req.body);
    const visit = await prisma.visit.update({
      where: { id: Number(req.params.id) },
      data: { outcome: body.outcome, remarks: body.remarks, checkOutTime: new Date() },
    });
    res.json(visit);
  })
);

router.post(
  '/:id/skip',
  asyncHandler(async (req, res) => {
    const visit = await prisma.visit.update({ where: { id: Number(req.params.id) }, data: { visitStatus: 'SKIPPED' } });
    res.json(visit);
  })
);

const adhocSchema = z.object({ retailerId: z.number() });

/**
 * Logs an unplanned field visit (a shop not on today's PJP-generated route)
 * and, if it isn't already scheduled for this weekday, adds it to the OB's
 * PJP going forward — every real visit becomes part of the standing route,
 * not just a one-off. Creates the OB's first PJP on the fly if none exists.
 */
router.post(
  '/adhoc',
  asyncHandler(async (req, res) => {
    const body = adhocSchema.parse(req.body);
    const obUserId = req.user!.id;
    const now = new Date();
    const dow = now.getDay();

    let pjp = await prisma.pJP.findFirst({ where: { obUserId, active: true } });
    if (!pjp) {
      pjp = await prisma.pJP.create({ data: { name: `${req.user!.name.split(' (')[0]} - Weekly PJP`, obUserId } });
    }

    const existingEntry = await prisma.pJPVisitPlan.findFirst({ where: { pjpId: pjp.id, retailerId: body.retailerId, dayOfWeek: dow } });
    if (!existingEntry) {
      const maxSeq = await prisma.pJPVisitPlan.aggregate({ where: { pjpId: pjp.id, dayOfWeek: dow }, _max: { sequenceOrder: true } });
      await prisma.pJPVisitPlan.create({
        data: { pjpId: pjp.id, retailerId: body.retailerId, dayOfWeek: dow, sequenceOrder: (maxSeq._max.sequenceOrder ?? -1) + 1, autoAdded: true },
      });
    }

    const visit = await prisma.visit.create({
      data: {
        obUserId,
        retailerId: body.retailerId,
        plannedDate: dayStart(now),
        visitStatus: 'VISITED',
        checkInTime: now,
      },
      include: { retailer: true },
    });

    const retailer = visit.retailer;
    const data: any = { lastVisitDate: now };
    if (retailer.status === 'UNTAPPED') data.status = 'COVERED';
    await prisma.retailer.update({ where: { id: retailer.id }, data });

    res.status(201).json({ ...visit, addedToPjp: !existingEntry });
  })
);

export default router;
