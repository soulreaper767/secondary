import { Request, Response, NextFunction } from 'express';
import { resolveScopedNodeIds, resolveScopedNodeIdsWithAncestors } from '../lib/territory';

export function requireRole(...roleCodes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roleCodes.includes(req.user.role.code)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/** Attaches req.scopedNodeIds = the territory ids this user is allowed to see (null = unrestricted). */
export async function scopeToTerritory(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  req.scopedNodeIds = await resolveScopedNodeIds(req.user);
  next();
}

/**
 * Like scopeToTerritory, but also includes ancestor nodes — for endpoints
 * (distributors, stock balance) whose entities live at a level *above* a
 * field user's own territory node.
 */
export async function scopeToTerritoryWithAncestors(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  req.scopedNodeIds = await resolveScopedNodeIdsWithAncestors(req.user);
  next();
}
