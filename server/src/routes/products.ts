import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

// ── Product families (the item master "document" — a flavor/brand line) ──

router.get(
  '/families',
  asyncHandler(async (req, res) => {
    const { active } = req.query;
    const where: any = {};
    if (active !== undefined) where.active = active === 'true';
    const families = await prisma.productFamily.findMany({
      where,
      include: { variants: { orderBy: [{ packaging: 'asc' }, { size: 'asc' }] } },
      orderBy: [{ brand: 'asc' }, { name: 'asc' }],
    });
    res.json(families);
  })
);

const familySchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

router.post(
  '/families',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = familySchema.parse(req.body);
    const family = await prisma.productFamily.create({ data: body });
    res.status(201).json(family);
  })
);

router.put(
  '/families/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = familySchema.partial().parse(req.body);
    const family = await prisma.productFamily.update({ where: { id: Number(req.params.id) }, data: body });
    res.json(family);
  })
);

// ── Product variants (the sellable SKUs — one packaging/size per family) ──

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { active, familyId } = req.query;
    const where: any = {};
    if (active !== undefined) where.active = active === 'true';
    if (familyId) where.familyId = Number(familyId);
    const products = await prisma.product.findMany({
      where,
      include: { family: true },
      orderBy: [{ family: { brand: 'asc' } }, { family: { name: 'asc' } }, { packaging: 'asc' }, { size: 'asc' }],
    });
    res.json(products);
  })
);

const variantSchema = z.object({
  familyId: z.number(),
  packaging: z.enum(['PET', 'CAN']),
  size: z.string().min(1),
  skuCode: z.string().min(1),
  mrp: z.number().positive(),
  distributorPrice: z.number().positive(),
  active: z.boolean().optional(),
});

router.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = variantSchema.parse(req.body);
    const product = await prisma.product.create({ data: body, include: { family: true } });
    res.status(201).json(product);
  })
);

router.put(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = variantSchema.partial().parse(req.body);
    const product = await prisma.product.update({ where: { id: Number(req.params.id) }, data: body, include: { family: true } });
    res.json(product);
  })
);

router.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.product.update({ where: { id: Number(req.params.id) }, data: { active: false } });
    res.status(204).send();
  })
);

export default router;
