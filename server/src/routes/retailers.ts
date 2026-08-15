import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { scopeToTerritory } from '../middleware/rbac';
import { upload } from '../middleware/upload';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  scopeToTerritory,
  asyncHandler(async (req, res) => {
    const { status, category, territoryNodeId, search, page = '1', pageSize = '50' } = req.query;
    const where: any = {};
    if (req.scopedNodeIds) where.territoryNodeId = { in: req.scopedNodeIds };
    if (territoryNodeId) where.territoryNodeId = Number(territoryNodeId);
    if (status) where.status = String(status);
    if (category) where.category = String(category);
    if (search) where.name = { contains: String(search) };

    const take = Math.min(Number(pageSize), 200);
    const skip = (Number(page) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.retailer.findMany({
        where,
        include: { territoryNode: true, addedByUser: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.retailer.count({ where }),
    ]);
    res.json({ items, total, page: Number(page), pageSize: take });
  })
);

router.get(
  '/kanban',
  scopeToTerritory,
  asyncHandler(async (req, res) => {
    const where: any = {};
    if (req.scopedNodeIds) where.territoryNodeId = { in: req.scopedNodeIds };
    const [untapped, covered, productive, nonProductive] = await Promise.all([
      prisma.retailer.findMany({ where: { ...where, status: 'UNTAPPED' }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.retailer.findMany({ where: { ...where, status: 'COVERED' }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.retailer.findMany({ where: { ...where, status: 'PRODUCTIVE' }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.retailer.findMany({ where: { ...where, status: 'NON_PRODUCTIVE' }, orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    res.json({ UNTAPPED: untapped, COVERED: covered, PRODUCTIVE: productive, NON_PRODUCTIVE: nonProductive });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const retailer = await prisma.retailer.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        territoryNode: true,
        addedByUser: { select: { id: true, name: true } },
        visits: { orderBy: { plannedDate: 'desc' }, take: 20 },
        orders: { orderBy: { orderDate: 'desc' }, take: 20, include: { items: { include: { product: { include: { family: true } } } } } },
      },
    });
    if (!retailer) throw new ApiError(404, 'Retailer not found');
    res.json(retailer);
  })
);

const retailerSchema = z.object({
  name: z.string().min(1),
  ownerName: z.string().optional(),
  category: z.enum(['GENERAL_TRADE', 'WHOLESALE', 'HORECA', 'MODERN_TRADE', 'KIRANA']),
  phone: z.string().optional(),
  address: z.string().optional(),
  territoryNodeId: z.coerce.number(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

router.post(
  '/',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const body = retailerSchema.parse(req.body);
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const retailer = await prisma.retailer.create({
      data: { ...body, imageUrl, addedByUserId: req.user!.id, status: 'UNTAPPED' },
      include: { territoryNode: true },
    });
    res.status(201).json(retailer);
  })
);

router.put(
  '/:id',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const body = retailerSchema.partial().parse(req.body);
    const data: any = { ...body };
    if (req.file) data.imageUrl = `/uploads/${req.file.filename}`;
    const retailer = await prisma.retailer.update({ where: { id: Number(req.params.id) }, data });
    res.json(retailer);
  })
);

export default router;
