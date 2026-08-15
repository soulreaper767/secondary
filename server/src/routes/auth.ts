import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifyPassword } from '../lib/password';
import { signToken } from '../lib/jwt';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email }, include: { role: true, territoryNode: true } });
    if (!user || user.status !== 'ACTIVE' || !verifyPassword(password, user.passwordHash)) {
      throw new ApiError(401, 'Invalid email or password');
    }
    const token = signToken({ userId: user.id, roleCode: user.role.code });
    const { passwordHash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { role: true, territoryNode: true, manager: { select: { id: true, name: true } } },
    });
    if (!user) throw new ApiError(404, 'User not found');
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  })
);

export default router;
