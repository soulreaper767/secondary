# SecondarySales — Sales & Distribution Management System

A complete, self-hosted secondary sales, distribution, and territory management
system for a beverage manufacturer that sells through a field sales team into
distributors, wholesale, and retail trade.

## What's in here

- **Full role hierarchy**: Admin, Chief Sales Officer (CSO), General Manager
  (GM), Regional Manager (RM), Unit Manager (UM), Area Manager (AM), Territory
  Sales Officer (TSO), Order Booker (OB), and a Distributor portal login.
  Admins can add further company-specific roles from **Admin → Roles**.
- **Territory tree**: National → Region → Unit (Sub-Region) → Area →
  Territory. Every node rolls up the full universe and sales of everything
  beneath it, and every non-admin role is scoped to their own node's subtree
  (with distributors/facilities one level up also visible to field roles).
- **Retail universe tracking**: Order Bookers add shops (with photo, category,
  contact) into the territory's universe. Lifecycle: Untapped → Covered
  (visited) → Productive (ordered) → Non-Productive (30+ days no order),
  which triggers escalating in-app notifications up the management chain.
- **PJP & route plans**: weekly Permanent Journey Plans per Order Booker,
  auto-generated daily route plans, check-in/outcome capture, and — every
  ad-hoc field visit automatically seeds/extends the standing PJP, so the
  route plan grows from real behavior, not just manual planning. Each stop
  carries a `sequenceOrder`, ready for future route optimization.
- **Distribution flow**: primary stock transfers (company → distributor) and
  distributor-raised stock orders/indents, a full stock ledger, live
  distributor stock balances, secondary sales (distributor → trade) that
  decrement stock automatically, receipts (payment collection, since shops
  commonly get short-term credit) and returns (damage/expiry/wrong-SKU,
  which reverse the stock impact).
- **Shop-level stock report**: order bookers record a physical shelf stock
  count on visits, giving a per-customer/wholesaler stock report independent
  of the sales ledger.
- **Incentives**: each role can stack multiple simultaneous schemes — percent
  of sales, achievement slabs, per-case/unit volume kickers, and per-new-
  productive-shop development bonuses — all computed and reported together.
- **BI-style dashboards & reports**: KPI cards, funnel/trend/bar charts,
  kanban universe board, territory drill-down tree, leaderboards, secondary
  sales reports (by distributor/SKU/territory/order booker, with a repeat-vs-
  new split), and print-ready letterheads — distributor- or shop-specific
  where relevant — for every report and document list.

## Tech stack

- **Server**: Node.js, Express, TypeScript, Prisma ORM, SQLite (file-based —
  no separate database server to install).
- **Client**: React, TypeScript, Vite, Tailwind CSS, Recharts, lucide-react.
- Single Node process serves both the API and the built client in production.

## Getting started (development)

```bash
npm install                 # installs both workspaces
npm run db:migrate:dev -w server   # (already applied if you cloned as-is)
npm run db:seed -w server          # seeds roles, territories, users, demo data
npm run dev                        # runs API (http://localhost:4000) + Vite (http://localhost:5173)
```

Open http://localhost:5173 and sign in with any seeded account — password for
every demo account is **`Password123!`**:

| Email | Role |
|---|---|
| admin@demo.local | System Admin |
| cso@demo.local | Chief Sales Officer |
| gm@demo.local | General Manager Sales |
| rm1@demo.local, rm2@demo.local | Regional Manager |
| um1..um4@demo.local | Unit Manager |
| am1..am8@demo.local | Area Manager |
| tso1..tso16@demo.local | Territory Sales Officer |
| ob1..ob16@demo.local | Order Booker |
| distributor1..distributor8@demo.local | Distributor portal |

The seed script builds a full org (49 hierarchy users + 8 distributor
logins), 16 territories, ~300 retailers, 45 days of simulated visits/orders/
receipts/returns, sample stock-takes, pending stock orders, and computed
incentive earnings — so every dashboard has real data to show immediately.

To reset and reseed from scratch: `npm run db:reset -w server`.

## Production build

```bash
npm run build   # builds the client, then the server (incl. prisma generate)
npm start       # runs the single Node process serving API + built client
```

See `DEPLOYMENT.md` for a full VPS deployment walkthrough.

## Project layout

```
server/   Express API, Prisma schema/migrations/seed
client/   React SPA (Vite)
```
