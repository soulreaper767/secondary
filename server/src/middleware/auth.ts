import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export interface AuthedUser {
  id: number;
  name: string;
  email: string;
  roleId: number;
  role: { id: number; code: string; name: string; level: number };
  territoryNodeId: number | null;
  managerId: number | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
      scopedNodeIds?: number[] | null;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
    const token = header.slice('Bearer '.length);
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });
    if (!user || user.status !== 'ACTIVE') return res.status(401).json({ error: 'Not authenticated' });
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      role: user.role,
      territoryNodeId: user.territoryNodeId,
      managerId: user.managerId,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
