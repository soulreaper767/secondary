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
    const { active } = req.query;
    const where: any = {};
    if (active !== undefined) where.active = active === 'true';
    const products = await prisma.product.findMany({ where, orderBy: [{ brand: 'asc' }, { name: 'asc' }] });
    res.json(products);
  })
);

const productSchema = z.object({
  name: z.string().min(1),
  skuCode: z.string().min(1),
  category: z.string().min(1),
  brand: z.string().min(1),
  packSize: z.string().min(1),
  mrp: z.number().positive(),
  distributorPrice: z.number().positive(),
  active: z.boolean().optional(),
});

router.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = productSchema.parse(req.body);
    const product = await prisma.product.create({ data: body });
    res.status(201).json(product);
  })
);

router.put(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = productSchema.partial().parse(req.body);
    const product = await prisma.product.update({ where: { id: Number(req.params.id) }, data: body });
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
