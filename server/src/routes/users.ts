import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/password';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

const DEFAULT_PASSWORD = 'Password123!';

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { roleCode, territoryNodeId, search } = req.query;
    const where: any = {};
    if (roleCode) where.role = { code: String(roleCode) };
    if (territoryNodeId) where.territoryNodeId = Number(territoryNodeId);
    if (search) where.name = { contains: String(search) };
    const users = await prisma.user.findMany({
      where,
      include: { role: true, territoryNode: true, manager: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(users.map(({ passwordHash, ...u }) => u));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      include: { role: true, territoryNode: true, manager: { select: { id: true, name: true } } },
    });
    if (!user) throw new ApiError(404, 'User not found');
    const { passwordHash, ...safe } = user;
    res.json(safe);
  })
);

router.get(
  '/:id/reports',
  asyncHandler(async (req, res) => {
    const reports = await prisma.user.findMany({
      where: { managerId: Number(req.params.id) },
      include: { role: true, territoryNode: true },
      orderBy: { name: 'asc' },
    });
    res.json(reports.map(({ passwordHash, ...u }) => u));
  })
);

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  employeeCode: z.string().min(1),
  phone: z.string().optional(),
  roleId: z.number(),
  territoryNodeId: z.number().nullable().optional(),
  managerId: z.number().nullable().optional(),
  password: z.string().min(6).optional(),
});

router.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = userSchema.parse(req.body);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        employeeCode: body.employeeCode,
        phone: body.phone,
        roleId: body.roleId,
        territoryNodeId: body.territoryNodeId ?? null,
        managerId: body.managerId ?? null,
        passwordHash: hashPassword(body.password || DEFAULT_PASSWORD),
      },
      include: { role: true, territoryNode: true },
    });
    const { passwordHash, ...safe } = user;
    res.status(201).json(safe);
  })
);

router.put(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = userSchema.partial().parse(req.body);
    const data: any = { ...body };
    if (body.password) data.passwordHash = hashPassword(body.password);
    delete data.password;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data,
      include: { role: true, territoryNode: true },
    });
    const { passwordHash, ...safe } = user;
    res.json(safe);
  })
);

router.patch(
  '/:id/status',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { status } = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }).parse(req.body);
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { status } });
    res.json({ id: user.id, status: user.status });
  })
);

export default router;
