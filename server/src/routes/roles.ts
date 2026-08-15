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
  asyncHandler(async (_req, res) => {
    const roles = await prisma.role.findMany({ orderBy: { level: 'asc' } });
    res.json(roles);
  })
);

const roleSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z0-9_]+$/, 'Use upper-case letters, numbers and underscores only'),
  name: z.string().min(1),
  level: z.number().min(0),
  description: z.string().optional(),
});

// Lets admins define company-specific roles beyond the seeded ladder
// (CSO/GM/RM/UM/AM/TSO/OB/DISTRIBUTOR) — e.g. a "Key Accounts Manager" or
// "Merchandiser" role — without a code change.
router.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = roleSchema.parse(req.body);
    const role = await prisma.role.create({ data: body });
    res.status(201).json(role);
  })
);

router.put(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = roleSchema.partial().parse(req.body);
    const role = await prisma.role.update({ where: { id: Number(req.params.id) }, data: body });
    res.json(role);
  })
);

export default router;
