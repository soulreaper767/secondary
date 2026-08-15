import { prisma } from '../prisma';
import { notifyNonProductiveShop } from '../notify';
import { NON_PRODUCTIVE_DAYS } from '../../config';

/**
 * Scans PRODUCTIVE retailers whose lastOrderDate is older than the
 * non-productive threshold, flips them to NON_PRODUCTIVE, and notifies
 * the responsible order booker + up the territory management chain.
 */
export async function runNonProductiveScan() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NON_PRODUCTIVE_DAYS);

  const stale = await prisma.retailer.findMany({
    where: { status: 'PRODUCTIVE', lastOrderDate: { lt: cutoff } },
    select: { id: true, name: true, addedByUserId: true, territoryNodeId: true },
  });

  for (const shop of stale) {
    await prisma.retailer.update({ where: { id: shop.id }, data: { status: 'NON_PRODUCTIVE' } });
    await notifyNonProductiveShop(shop);
  }

  return stale.length;
}
