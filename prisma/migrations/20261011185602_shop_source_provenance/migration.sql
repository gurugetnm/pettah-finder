-- CreateTable
CREATE TABLE "ShopSource" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "license" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "attributionUrl" TEXT,
    "datasetVersion" TEXT,
    "locationPrecision" TEXT NOT NULL,
    "verificationEvidence" TEXT,
    "rawTags" JSONB,
    "history" JSONB NOT NULL DEFAULT '[]',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopSource_shopId_idx" ON "ShopSource"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSource_source_sourceRecordId_key" ON "ShopSource"("source", "sourceRecordId");

-- AddForeignKey
ALTER TABLE "ShopSource" ADD CONSTRAINT "ShopSource_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
