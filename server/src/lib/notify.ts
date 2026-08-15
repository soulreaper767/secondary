import { prisma } from './prisma';
import { getAncestorNodes } from './territory';

export async function notify(
  userId: number,
  type: 'SHOP_NON_PRODUCTIVE' | 'TARGET_ALERT' | 'STOCK_LOW' | 'PJP_MISSED' | 'GENERAL',
  title: string,
  message: string,
  relatedEntityType?: string,
  relatedEntityId?: number
) {
  return prisma.notification.create({
    data: { userId, type, title, message, relatedEntityType, relatedEntityId },
  });
}

/**
 * A shop has just been flagged NON_PRODUCTIVE (no order in 30+ days).
 * Notify the order booker who owns it and the territory/area managers above it,
 * asking them to plan a senior-management visit to understand why.
 */
export async function notifyNonProductiveShop(retailer: {
  id: number;
  name: string;
  addedByUserId: number;
  territoryNodeId: number;
}) {
  const recipients = new Set<number>([retailer.addedByUserId]);

  const ancestors = await getAncestorNodes(retailer.territoryNodeId);
  const selfNode = await prisma.territoryNode.findUnique({ where: { id: retailer.territoryNodeId } });
  const chain = selfNode ? [selfNode, ...ancestors] : ancestors;
  for (const node of chain) {
    if (node.managerUserId) recipients.add(node.managerUserId);
  }

  const title = `Shop flagged Non-Productive: ${retailer.name}`;
  const message = `${retailer.name} has had no orders in 30+ days and has been moved to Non-Productive. Please plan a senior management visit to understand the reason and re-activate the outlet.`;

  await Promise.all(
    Array.from(recipients).map((userId) =>
      notify(userId, 'SHOP_NON_PRODUCTIVE', title, message, 'Retailer', retailer.id)
    )
  );
}
