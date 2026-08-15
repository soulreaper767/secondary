-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Retailer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "ownerName" TEXT,
    "category" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "imageUrl" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "chillerType" TEXT NOT NULL DEFAULT 'NONE',
    "competitorExclusive" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'UNTAPPED',
    "lastVisitDate" DATETIME,
    "lastOrderDate" DATETIME,
    "territoryNodeId" INTEGER NOT NULL,
    "addedByUserId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Retailer_territoryNodeId_fkey" FOREIGN KEY ("territoryNodeId") REFERENCES "TerritoryNode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Retailer_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Retailer" ("addedByUserId", "address", "category", "createdAt", "id", "imageUrl", "lastOrderDate", "lastVisitDate", "latitude", "longitude", "name", "ownerName", "phone", "status", "territoryNodeId", "updatedAt") SELECT "addedByUserId", "address", "category", "createdAt", "id", "imageUrl", "lastOrderDate", "lastVisitDate", "latitude", "longitude", "name", "ownerName", "phone", "status", "territoryNodeId", "updatedAt" FROM "Retailer";
DROP TABLE "Retailer";
ALTER TABLE "new_Retailer" RENAME TO "Retailer";
CREATE INDEX "Retailer_territoryNodeId_idx" ON "Retailer"("territoryNodeId");
CREATE INDEX "Retailer_status_idx" ON "Retailer"("status");
CREATE TABLE "new_TerritoryNode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "parentId" INTEGER,
    "marketPotential" INTEGER NOT NULL DEFAULT 0,
    "managerUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TerritoryNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TerritoryNode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TerritoryNode_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TerritoryNode" ("code", "createdAt", "id", "level", "managerUserId", "name", "parentId", "path", "updatedAt") SELECT "code", "createdAt", "id", "level", "managerUserId", "name", "parentId", "path", "updatedAt" FROM "TerritoryNode";
DROP TABLE "TerritoryNode";
ALTER TABLE "new_TerritoryNode" RENAME TO "TerritoryNode";
CREATE UNIQUE INDEX "TerritoryNode_code_key" ON "TerritoryNode"("code");
CREATE INDEX "TerritoryNode_path_idx" ON "TerritoryNode"("path");
CREATE INDEX "TerritoryNode_parentId_idx" ON "TerritoryNode"("parentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
