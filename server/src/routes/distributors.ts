import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/password';
import { requireAuth } from '../middleware/auth';
import { requireRole, scopeToTerritoryWithAncestors } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  scopeToTerritoryWithAncestors,
  asyncHandler(async (req, res) => {
    const where: any = {};
    if (req.scopedNodeIds) where.territoryNodeId = { in: req.scopedNodeIds };
    const distributors = await prisma.distributor.findMany({
      where,
      include: { territoryNode: true, user: { select: { id: true, email: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(distributors);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const distributor = await prisma.distributor.findUnique({
      where: { id: Number(req.params.id) },
      include: { territoryNode: true },
    });
    if (!distributor) throw new ApiError(404, 'Distributor not found');
    res.json(distributor);
  })
);

const distributorSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  territoryNodeId: z.number(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  creditLimit: z.number().optional(),
  createLogin: z.boolean().optional(),
  loginEmail: z.string().email().optional(),
});

router.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = distributorSchema.parse(req.body);
    let userId: number | undefined;
    if (body.createLogin && body.loginEmail) {
      const distRole = await prisma.role.findUnique({ where: { code: 'DISTRIBUTOR' } });
      if (!distRole) throw new ApiError(500, 'DISTRIBUTOR role missing');
      const user = await prisma.user.create({
        data: {
          name: `${body.name} (Distributor Login)`,
          email: body.loginEmail,
          employeeCode: `DIST-${body.code}`,
          roleId: distRole.id,
          passwordHash: hashPassword('Password123!'),
        },
      });
      userId = user.id;
    }
    const distributor = await prisma.distributor.create({
      data: {
        name: body.name,
        code: body.code,
        territoryNodeId: body.territoryNodeId,
        address: body.address,
        contactPerson: body.contactPerson,
        phone: body.phone,
        creditLimit: body.creditLimit ?? 0,
        userId,
      },
      include: { territoryNode: true },
    });
    res.status(201).json(distributor);
  })
);

router.put(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = distributorSchema.partial().parse(req.body);
    const { createLogin, loginEmail, ...rest } = body;
    const distributor = await prisma.distributor.update({ where: { id: Number(req.params.id) }, data: rest });
    res.json(distributor);
  })
);

export default router;
