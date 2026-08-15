import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Password123!';
const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

function buildPath(parentPath: string | null, id: number): string {
  return `${parentPath ?? '-'}${id}-`;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  }
  return out;
}

async function main() {
  const existingRoles = await prisma.role.count();
  if (existingRoles > 0) {
    console.log('Database already seeded (roles exist). Skipping. Run `npm run db:reset -w server` to reseed from scratch.');
    return;
  }

  console.log('Seeding roles...');
  // CSO (Chief Sales Officer) > GM (General Manager) > RM (Regional Manager)
  // > UM (Unit Manager) > AM (Area Manager) > TSO (Territory Sales Officer)
  // > OB (Order Booker / Presales) > DISTRIBUTOR (portal-only login).
  // Admin can add further company-specific roles at any time from Admin > Roles.
  const roleDefs = [
    { code: 'ADMIN', name: 'System Administrator', level: 0, description: 'Full system access, manages users/entities' },
    { code: 'CSO', name: 'Chief Sales Officer', level: 1, description: 'National GM Sales, top of the sales organization' },
    { code: 'GM', name: 'General Manager Sales', level: 2, description: 'National sales operations, reports to CSO' },
    { code: 'RM', name: 'Regional Manager', level: 3, description: 'Manages a Region' },
    { code: 'UM', name: 'Unit Manager', level: 4, description: 'Manages a Unit (Sub-Region)' },
    { code: 'AM', name: 'Area Manager', level: 5, description: 'Manages an Area' },
    { code: 'TSO', name: 'Territory Sales Officer', level: 6, description: 'Territory Sales Executive/Officer — manages a Territory' },
    { code: 'OB', name: 'Order Booker / Presales', level: 7, description: 'Field executor: universe, PJP, visits, orders' },
    { code: 'DISTRIBUTOR', name: 'Distributor Portal User', level: 8, description: 'External distributor login' },
  ] as const;
  const roles: Record<string, any> = {};
  for (const r of roleDefs) {
    roles[r.code] = await prisma.role.create({ data: r });
  }

  console.log('Building territory tree...');
  const national = await createNode('National HQ', 'N', 'NATIONAL', null);
  const regions: any[] = [];
  for (const dir of ['North', 'South']) {
    const region = await createNode(`${dir} Region`, `R-${dir[0]}`, 'REGION', national);
    regions.push(region);
  }
  const subRegions: any[] = [];
  for (const region of regions) {
    for (const z of [1, 2]) {
      const sr = await createNode(`${region.name} Unit ${z}`, `${region.code}-U${z}`, 'SUB_REGION', region);
      subRegions.push(sr);
    }
  }
  const areas: any[] = [];
  for (const sr of subRegions) {
    for (const a of [1, 2]) {
      const area = await createNode(`${sr.name} Area ${a}`, `${sr.code}-A${a}`, 'AREA', sr);
      areas.push(area);
    }
  }
  const territories: any[] = [];
  for (const area of areas) {
    for (const t of [1, 2]) {
      const territory = await createNode(`${area.name} Territory ${t}`, `${area.code}-T${t}`, 'TERRITORY', area);
      // Estimated true addressable outlet count, set independently of how
      // many shops have actually been captured — a realistic market-survey
      // number, always higher than what's been tapped so there's a real
      // expansion gap for the coverage-opportunity report to surface.
      const marketPotential = randInt(45, 140);
      await prisma.territoryNode.update({ where: { id: territory.id }, data: { marketPotential } });
      territory.marketPotential = marketPotential;
      territories.push(territory);
    }
  }
  console.log(`  ${regions.length} regions, ${subRegions.length} units, ${areas.length} areas, ${territories.length} territories`);

  async function createNode(name: string, code: string, level: string, parent: any) {
    const created = await prisma.territoryNode.create({
      data: { name, code, level: level as any, parentId: parent?.id ?? null, path: '-temp-' },
    });
    const finalPath = buildPath(parent ? parent.path : null, created.id);
    return prisma.territoryNode.update({ where: { id: created.id }, data: { path: finalPath } });
  }

  console.log('Creating users...');
  const admin = await prisma.user.create({
    data: { name: 'System Admin', email: 'admin@demo.local', employeeCode: 'ADM001', roleId: roles.ADMIN.id, passwordHash },
  });

  const cso = await prisma.user.create({
    data: {
      name: 'Amir Khalid (CSO)',
      email: 'cso@demo.local',
      employeeCode: 'CSO001',
      roleId: roles.CSO.id,
      territoryNodeId: national.id,
      passwordHash,
    },
  });
  const gm = await prisma.user.create({
    data: {
      name: 'Bilal Ahmed (GM)',
      email: 'gm@demo.local',
      employeeCode: 'GM001',
      roleId: roles.GM.id,
      territoryNodeId: national.id,
      managerId: cso.id,
      passwordHash,
    },
  });
  await prisma.territoryNode.update({ where: { id: national.id }, data: { managerUserId: gm.id } });

  const firstNames = ['Ali', 'Usman', 'Hassan', 'Bilal', 'Kamran', 'Faisal', 'Imran', 'Adnan', 'Waqas', 'Shahid', 'Naveed', 'Asad', 'Zeeshan', 'Tariq', 'Omar', 'Salman', 'Farhan', 'Junaid', 'Rizwan', 'Aamir', 'Sana', 'Ayesha', 'Hina', 'Maria', 'Sara'];
  const lastNames = ['Khan', 'Malik', 'Butt', 'Sheikh', 'Chaudhry', 'Raza', 'Iqbal', 'Ahmed', 'Hussain', 'Farooq', 'Javed', 'Aslam', 'Baig', 'Qureshi', 'Mirza'];
  function personName() {
    return `${pick(firstNames)} ${pick(lastNames)}`;
  }

  const rmByRegionId = new Map<number, any>();
  for (const [i, region] of regions.entries()) {
    const user = await prisma.user.create({
      data: {
        name: `${personName()} (RM)`,
        email: `rm${i + 1}@demo.local`,
        employeeCode: `RM${String(i + 1).padStart(2, '0')}`,
        roleId: roles.RM.id,
        territoryNodeId: region.id,
        managerId: gm.id,
        passwordHash,
      },
    });
    await prisma.territoryNode.update({ where: { id: region.id }, data: { managerUserId: user.id } });
    rmByRegionId.set(region.id, user);
  }

  const umBySubRegionId = new Map<number, any>();
  for (const [i, sr] of subRegions.entries()) {
    const manager = rmByRegionId.get(sr.parentId);
    const user = await prisma.user.create({
      data: {
        name: `${personName()} (UM)`,
        email: `um${i + 1}@demo.local`,
        employeeCode: `UM${String(i + 1).padStart(2, '0')}`,
        roleId: roles.UM.id,
        territoryNodeId: sr.id,
        managerId: manager.id,
        passwordHash,
      },
    });
    await prisma.territoryNode.update({ where: { id: sr.id }, data: { managerUserId: user.id } });
    umBySubRegionId.set(sr.id, user);
  }

  const amByAreaId = new Map<number, any>();
  for (const [i, area] of areas.entries()) {
    const manager = umBySubRegionId.get(area.parentId);
    const user = await prisma.user.create({
      data: {
        name: `${personName()} (AM)`,
        email: `am${i + 1}@demo.local`,
        employeeCode: `AM${String(i + 1).padStart(2, '0')}`,
        roleId: roles.AM.id,
        territoryNodeId: area.id,
        managerId: manager.id,
        passwordHash,
      },
    });
    await prisma.territoryNode.update({ where: { id: area.id }, data: { managerUserId: user.id } });
    amByAreaId.set(area.id, user);
  }

  const tsoByTerritoryId = new Map<number, any>();
  const obByTerritoryId = new Map<number, any>();
  for (const [i, territory] of territories.entries()) {
    const am = amByAreaId.get(territory.parentId);
    const tso = await prisma.user.create({
      data: {
        name: `${personName()} (TSO)`,
        email: `tso${i + 1}@demo.local`,
        employeeCode: `TSO${String(i + 1).padStart(2, '0')}`,
        roleId: roles.TSO.id,
        territoryNodeId: territory.id,
        managerId: am.id,
        passwordHash,
      },
    });
    await prisma.territoryNode.update({ where: { id: territory.id }, data: { managerUserId: tso.id } });
    tsoByTerritoryId.set(territory.id, tso);

    const ob = await prisma.user.create({
      data: {
        name: `${personName()} (Order Booker)`,
        email: `ob${i + 1}@demo.local`,
        employeeCode: `OB${String(i + 1).padStart(2, '0')}`,
        roleId: roles.OB.id,
        territoryNodeId: territory.id,
        managerId: tso.id,
        passwordHash,
      },
    });
    obByTerritoryId.set(territory.id, ob);
  }
  console.log(`  ${1 + 1 + 1 + regions.length + subRegions.length + areas.length + territories.length * 2} hierarchy users created`);

  console.log('Creating product families & SKU variants...');
  // Item master: three flavors under the Zalmi brand, each sold in three
  // packaging/size variants. New variants can be added later under the same
  // family without touching these records — see Admin > Products.
  const familyDefs = [
    { name: 'Cola', brand: 'Zalmi', category: 'Carbonated Soft Drink', description: 'Classic cola flavor', skuPrefix: 'COLA' },
    { name: 'Clear', brand: 'Zalmi', category: 'Carbonated Soft Drink', description: 'Crisp, clear lemon-lime soda', skuPrefix: 'CLEAR' },
    { name: 'Zing', brand: 'Zalmi', category: 'Carbonated Soft Drink', description: 'Zesty citrus-forward soda', skuPrefix: 'ZING' },
  ];
  const variantDefs = [
    { packaging: 'PET', size: '300ml', mrp: 40, distributorPrice: 32, skuSuffix: 'PET-300' },
    { packaging: 'PET', size: '1500ml', mrp: 150, distributorPrice: 120, skuSuffix: 'PET-1500' },
    { packaging: 'CAN', size: '250ml', mrp: 60, distributorPrice: 48, skuSuffix: 'CAN-250' },
  ];
  const products = [];
  for (const f of familyDefs) {
    const { skuPrefix, ...familyData } = f;
    const family = await prisma.productFamily.create({ data: familyData });
    for (const v of variantDefs) {
      products.push(
        await prisma.product.create({
          data: {
            familyId: family.id,
            packaging: v.packaging,
            size: v.size,
            skuCode: `ZAL-${skuPrefix}-${v.skuSuffix}`,
            mrp: v.mrp,
            distributorPrice: v.distributorPrice,
          },
        })
      );
    }
  }

  console.log('Creating distributors + primary stock...');
  const distributorByAreaId = new Map<number, any>();
  for (const [i, area] of areas.entries()) {
    const distUser = await prisma.user.create({
      data: {
        name: `${area.name} Distribution Co. (Login)`,
        email: `distributor${i + 1}@demo.local`,
        employeeCode: `DIST${String(i + 1).padStart(2, '0')}`,
        roleId: roles.DISTRIBUTOR.id,
        passwordHash,
      },
    });
    const distributor = await prisma.distributor.create({
      data: {
        name: `${area.name} Distribution Co.`,
        code: `DIST-${area.code}`,
        territoryNodeId: area.id,
        address: `Main Warehouse, ${area.name}`,
        contactPerson: personName(),
        phone: `03${randInt(10, 49)}-${randInt(1000000, 9999999)}`,
        creditLimit: 2_000_000,
        userId: distUser.id,
      },
    });
    distributorByAreaId.set(area.id, distributor);

    // Two generous primary stock transfers so 45 days of secondary sales never run out.
    for (let t = 0; t < 2; t++) {
      const items = products.map((p) => ({ productId: p.id, qty: randInt(800, 1500), rate: p.distributorPrice }));
      const transfer = await prisma.stockTransfer.create({
        data: {
          referenceNo: `ST-SEED-${distributor.id}-${t}`,
          distributorId: distributor.id,
          transferDate: new Date(Date.now() - (60 - t * 20) * 86400000),
          items: { create: items },
        },
      });
      for (const item of items) {
        const balance = await prisma.distributorStockBalance.upsert({
          where: { distributorId_productId: { distributorId: distributor.id, productId: item.productId } },
          create: { distributorId: distributor.id, productId: item.productId, qty: item.qty },
          update: { qty: { increment: item.qty } },
        });
        await prisma.stockLedgerEntry.create({
          data: {
            distributorId: distributor.id,
            productId: item.productId,
            type: 'INBOUND_PRIMARY',
            qty: item.qty,
            refType: 'StockTransfer',
            refId: transfer.id,
            balanceAfter: balance.qty,
          },
        });
      }
    }
  }

  console.log('Creating retail universe (this takes a bit)...');
  // Weighted toward small-format trade, which dominates a real FMCG universe.
  const categories = [
    'GENERAL_STORE', 'GENERAL_STORE', 'GENERAL_STORE',
    'KIRYANA_STORE', 'KIRYANA_STORE',
    'PAN_SHOP', 'PAN_SHOP',
    'LARGE_STORE',
    'WHOLESALE',
    'HORECA',
    'MODERN_TRADE',
  ] as const;
  // Most shops have no dedicated chiller; company placement is the next
  // most common, then competitor presence, then a shop's own unbranded unit.
  const chillerTypes = ['NONE', 'NONE', 'NONE', 'NONE', 'COMPANY', 'COMPANY', 'COMPETITOR', 'SHOP_OWNED'] as const;
  const shopAdjectives = ['New', 'City', 'Metro', 'Green', 'Golden', 'Prime', 'Star', 'Royal', 'Sunrise', 'Blue Sky', 'Al-Madina', 'National'];
  const shopNouns = ['Store', 'Mart', 'Traders', 'Enterprises', 'General Store', 'Super Store', 'Corner Shop', 'Cash & Carry'];
  let retailerSeq = 1;
  const retailersByTerritoryId = new Map<number, any[]>();
  for (const territory of territories) {
    const ob = obByTerritoryId.get(territory.id);
    // Keep the recorded universe below marketPotential so there's always a
    // real, visible expansion gap per territory.
    const count = randInt(16, Math.min(28, territory.marketPotential - 5));
    const list: any[] = [];
    for (let i = 0; i < count; i++) {
      const retailer = await prisma.retailer.create({
        data: {
          name: `${pick(shopAdjectives)} ${pick(shopNouns)} #${retailerSeq++}`,
          ownerName: personName(),
          category: pick(categories) as any,
          chillerType: pick(chillerTypes) as any,
          competitorExclusive: Math.random() < 0.07,
          phone: `03${randInt(10, 49)}-${randInt(1000000, 9999999)}`,
          address: `Shop ${randInt(1, 200)}, ${territory.name}`,
          territoryNodeId: territory.id,
          addedByUserId: ob.id,
          status: 'UNTAPPED',
        },
      });
      list.push(retailer);
    }
    retailersByTerritoryId.set(territory.id, list);
  }
  const totalRetailers = Array.from(retailersByTerritoryId.values()).reduce((s, l) => s + l.length, 0);
  console.log(`  ${totalRetailers} retailers created`);

  console.log('Building PJPs...');
  const pjpEntriesByOb = new Map<number, { retailerId: number; dayOfWeek: number }[]>();
  for (const territory of territories) {
    const ob = obByTerritoryId.get(territory.id);
    const retailers = retailersByTerritoryId.get(territory.id)!;
    const covered = sample(retailers, Math.min(10, retailers.length));
    const entries = covered.map((r, idx) => ({ retailerId: r.id, dayOfWeek: randInt(1, 6), sequenceOrder: idx })); // Mon-Sat
    await prisma.pJP.create({
      data: { name: `${ob.name.split(' (')[0]} - Weekly PJP`, obUserId: ob.id, entries: { create: entries } },
    });
    pjpEntriesByOb.set(ob.id, entries);
  }

  console.log('Simulating 45 days of visits & secondary sales...');
  const DAYS = 45;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Leave a subset of shops order-free for their most recent ~32 days so the
  // non-productive (30-day) job has real shops to flag on first boot.
  const orderFreezeRetailerIds = new Set<number>();
  for (const list of retailersByTerritoryId.values()) {
    for (const r of sample(list, Math.max(1, Math.floor(list.length * 0.25)))) orderFreezeRetailerIds.add(r.id);
  }

  let ordersCreated = 0;
  for (const territory of territories) {
    const ob = obByTerritoryId.get(territory.id);
    const distributor = distributorByAreaId.get(territory.parentId);
    const entries = pjpEntriesByOb.get(ob.id) || [];

    for (let d = DAYS; d >= 1; d--) {
      const date = new Date(today.getTime() - d * 86400000);
      const dow = date.getDay();
      const dueToday = entries.filter((e) => e.dayOfWeek === dow);
      for (const entry of dueToday) {
        const willVisit = Math.random() < 0.75;
        if (!willVisit) {
          await prisma.visit.create({
            data: { obUserId: ob.id, retailerId: entry.retailerId, plannedDate: date, visitStatus: 'SKIPPED' },
          });
          continue;
        }

        const withinFreezeWindow = d <= 32 && orderFreezeRetailerIds.has(entry.retailerId);
        const willOrder = !withinFreezeWindow && Math.random() < 0.4;
        const outcome = willOrder ? 'ORDER_TAKEN' : 'NO_ORDER';

        const visit = await prisma.visit.create({
          data: {
            obUserId: ob.id,
            retailerId: entry.retailerId,
            plannedDate: date,
            visitStatus: 'VISITED',
            checkInTime: date,
            checkOutTime: date,
            outcome: outcome as any,
          },
        });

        const retailer = await prisma.retailer.findUnique({ where: { id: entry.retailerId } });
        const madeProductive = !!retailer && retailer.status !== 'PRODUCTIVE';
        // First visit gives an immediate verdict — Non-Productive unless this
        // very visit also results in an order (handled below, which overwrites
        // to Productive). No lingering "just visited" limbo state.
        const visitData: any = { lastVisitDate: date };
        if (retailer && retailer.status === 'UNTAPPED') visitData.status = 'NON_PRODUCTIVE';
        await prisma.retailer.update({ where: { id: entry.retailerId }, data: visitData });

        if (willOrder && distributor) {
          const lineItems = sample(products, randInt(1, 4)).map((p) => ({
            productId: p.id,
            qty: randInt(2, 20),
            unitPrice: p.distributorPrice,
          }));
          let totalAmount = 0;
          for (const li of lineItems) totalAmount += li.qty * li.unitPrice;

          const order = await prisma.order.create({
            data: {
              orderNumber: `SO-SEED-${entry.retailerId}-${d}-${randInt(1000, 9999)}`,
              retailerId: entry.retailerId,
              obUserId: ob.id,
              distributorId: distributor.id,
              orderDate: date,
              totalAmount,
              madeProductive,
              items: { create: lineItems.map((li) => ({ ...li, amount: li.qty * li.unitPrice })) },
            },
          });
          for (const li of lineItems) {
            const balance = await prisma.distributorStockBalance.update({
              where: { distributorId_productId: { distributorId: distributor.id, productId: li.productId } },
              data: { qty: { decrement: li.qty } },
            });
            await prisma.stockLedgerEntry.create({
              data: {
                distributorId: distributor.id,
                productId: li.productId,
                type: 'OUTBOUND_SECONDARY',
                qty: -li.qty,
                refType: 'Order',
                refId: order.id,
                balanceAfter: balance.qty,
                createdAt: date,
              },
            });
          }
          await prisma.retailer.update({ where: { id: entry.retailerId }, data: { status: 'PRODUCTIVE', lastOrderDate: date } });
          ordersCreated++;

          // ~30% of orders leave a small unpaid balance, giving the Receipts flow something to collect.
          const collected = Math.random() < 0.7 ? totalAmount : Math.round(totalAmount * randInt(50, 90) / 100);
          if (collected > 0) {
            await prisma.receipt.create({
              data: {
                receiptNumber: `RC-SEED-${order.id}`,
                retailerId: entry.retailerId,
                orderId: order.id,
                obUserId: ob.id,
                amount: collected,
                method: pick(['CASH', 'CASH', 'BANK', 'CREDIT_NOTE']),
                receivedAt: date,
              },
            });
          }

          // Occasional damaged/short-dated return against a recent order.
          if (Math.random() < 0.06) {
            const returnLine = pick(lineItems);
            const retQty = Math.min(returnLine.qty, randInt(1, 3));
            const retAmount = retQty * returnLine.unitPrice;
            const ret = await prisma.return.create({
              data: {
                returnNumber: `RET-SEED-${order.id}`,
                retailerId: entry.retailerId,
                distributorId: distributor.id,
                obUserId: ob.id,
                orderId: order.id,
                reason: pick(['Damaged in transit', 'Near expiry', 'Wrong SKU delivered', 'Shop overstocked']),
                returnDate: date,
                totalAmount: retAmount,
                items: { create: [{ productId: returnLine.productId, qty: retQty, unitPrice: returnLine.unitPrice, amount: retAmount }] },
              },
            });
            const balance = await prisma.distributorStockBalance.update({
              where: { distributorId_productId: { distributorId: distributor.id, productId: returnLine.productId } },
              data: { qty: { increment: retQty } },
            });
            await prisma.stockLedgerEntry.create({
              data: {
                distributorId: distributor.id,
                productId: returnLine.productId,
                type: 'RETURN_INBOUND',
                qty: retQty,
                refType: 'Return',
                refId: ret.id,
                balanceAfter: balance.qty,
                createdAt: date,
              },
            });
          }
        }
      }
    }
  }
  console.log(`  ${ordersCreated} historical orders created (with matching receipts & occasional returns)`);

  console.log('Recording sample shop stock-takes...');
  let stockTakesCreated = 0;
  for (const territory of territories) {
    const ob = obByTerritoryId.get(territory.id);
    const productiveShops = (retailersByTerritoryId.get(territory.id) || []).filter((r) => orderFreezeRetailerIds.has(r.id) === false);
    for (const shop of sample(productiveShops, Math.min(4, productiveShops.length))) {
      const current = await prisma.retailer.findUnique({ where: { id: shop.id } });
      if (!current || current.status !== 'PRODUCTIVE') continue;
      await prisma.stockTake.create({
        data: {
          retailerId: shop.id,
          obUserId: ob.id,
          takenAt: new Date(today.getTime() - randInt(0, 3) * 86400000),
          items: { create: sample(products, randInt(2, 5)).map((p) => ({ productId: p.id, qty: randInt(0, 40) })) },
        },
      });
      stockTakesCreated++;
    }
  }
  console.log(`  ${stockTakesCreated} stock-takes recorded`);

  console.log('Recording a couple of pending distributor stock orders (indents)...');
  let stockOrdersCreated = 0;
  for (const distributor of distributorByAreaId.values()) {
    if (!distributor.userId) continue;
    if (Math.random() < 0.5) continue;
    await prisma.stockOrder.create({
      data: {
        orderNumber: `SI-SEED-${distributor.id}`,
        distributorId: distributor.id,
        requestedByUserId: distributor.userId,
        status: 'PENDING',
        items: { create: sample(products, randInt(2, 4)).map((p) => ({ productId: p.id, qty: randInt(200, 600) })) },
      },
    });
    stockOrdersCreated++;
  }
  console.log(`  ${stockOrdersCreated} pending stock orders recorded`);

  console.log('Setting targets & incentive schemes...');
  const now = new Date();
  const period = { periodMonth: now.getMonth() + 1, periodYear: now.getFullYear() };
  const managementUsers = [
    cso,
    gm,
    ...Array.from(rmByRegionId.values()),
    ...Array.from(umBySubRegionId.values()),
    ...Array.from(amByAreaId.values()),
    ...Array.from(tsoByTerritoryId.values()),
    ...Array.from(obByTerritoryId.values()),
  ];
  const targetValueByRole: Record<string, number> = {
    CSO: 200_000_000,
    GM: 180_000_000,
    RM: 90_000_000,
    UM: 45_000_000,
    AM: 22_000_000,
    TSO: 2_800_000,
    OB: 1_400_000,
  };
  for (const user of managementUsers) {
    const roleCode = Object.keys(targetValueByRole).find((code) => roles[code].id === user.roleId);
    if (!roleCode) continue;
    await prisma.target.create({
      data: { userId: user.id, ...period, targetType: 'VALUE', targetValue: targetValueByRole[roleCode] },
    });
  }

  // Each role can stack more than one live incentive scheme (e.g. a base % of
  // sales plus a volume kicker or a market-development bonus) — the earnings
  // engine sums across every active scheme assigned to the role.
  const schemeDefs: { roleCode: string; name: string; basis: string; rulesJson: string }[] = [
    { roleCode: 'OB', name: 'Order Booker Base Incentive', basis: 'PERCENT_OF_SALES', rulesJson: JSON.stringify({ percent: 1.5 }) },
    { roleCode: 'OB', name: 'Order Booker Volume Kicker', basis: 'PER_CASE_SOLD', rulesJson: JSON.stringify({ ratePerCase: 5 }) },
    { roleCode: 'OB', name: 'Order Booker New Outlet Bonus', basis: 'PER_NEW_PRODUCTIVE_SHOP', rulesJson: JSON.stringify({ ratePerShop: 300 }) },
    {
      roleCode: 'TSO',
      name: 'TSO Achievement Slabs',
      basis: 'SLAB_ON_ACHIEVEMENT',
      rulesJson: JSON.stringify({ slabs: [{ minPct: 0, maxPct: 80, amount: 0 }, { minPct: 80, maxPct: 100, amount: 15000 }, { minPct: 100, maxPct: 9999, amount: 30000 }] }),
    },
    { roleCode: 'TSO', name: 'TSO New Outlet Development Bonus', basis: 'PER_NEW_PRODUCTIVE_SHOP', rulesJson: JSON.stringify({ ratePerShop: 150 }) },
    {
      roleCode: 'AM',
      name: 'AM Achievement Slabs',
      basis: 'SLAB_ON_ACHIEVEMENT',
      rulesJson: JSON.stringify({ slabs: [{ minPct: 0, maxPct: 80, amount: 0 }, { minPct: 80, maxPct: 100, amount: 40000 }, { minPct: 100, maxPct: 9999, amount: 80000 }] }),
    },
    { roleCode: 'UM', name: 'UM Sales Incentive', basis: 'PERCENT_OF_SALES', rulesJson: JSON.stringify({ percent: 1 }) },
    { roleCode: 'RM', name: 'RM Sales Incentive', basis: 'PERCENT_OF_SALES', rulesJson: JSON.stringify({ percent: 0.75 }) },
    {
      roleCode: 'GM',
      name: 'GM Achievement Slabs',
      basis: 'SLAB_ON_ACHIEVEMENT',
      rulesJson: JSON.stringify({ slabs: [{ minPct: 0, maxPct: 80, amount: 0 }, { minPct: 80, maxPct: 100, amount: 300000 }, { minPct: 100, maxPct: 9999, amount: 600000 }] }),
    },
    { roleCode: 'CSO', name: 'CSO Sales Incentive', basis: 'PERCENT_OF_SALES', rulesJson: JSON.stringify({ percent: 0.25 }) },
  ];
  for (const s of schemeDefs) {
    await prisma.incentiveScheme.create({ data: { name: s.name, roleId: roles[s.roleCode].id, basis: s.basis, rulesJson: s.rulesJson } });
  }

  console.log('Computing incentive earnings for the current period...');
  const { computeIncentiveForUser } = await import('../src/lib/incentives');
  for (const user of managementUsers) {
    await computeIncentiveForUser(user.id, period.periodMonth, period.periodYear);
  }

  console.log('\nSeed complete. Demo login credentials (all use password: Password123!):');
  console.log('  admin@demo.local        - System Admin');
  console.log('  cso@demo.local          - Chief Sales Officer');
  console.log('  gm@demo.local           - General Manager Sales');
  console.log('  rm1@demo.local          - Regional Manager (North)');
  console.log('  um1@demo.local          - Unit Manager');
  console.log('  am1@demo.local          - Area Manager');
  console.log('  tso1@demo.local         - Territory Sales Officer');
  console.log('  ob1@demo.local          - Order Booker');
  console.log('  distributor1@demo.local - Distributor portal login');
  console.log('  (numbered variants exist for every RM/UM/AM/TSO/OB/distributor — see the Users list in the Admin panel.)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
