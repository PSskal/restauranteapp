-- AlterTable
ALTER TABLE "public"."Table" ADD COLUMN     "zoneId" TEXT;

-- CreateTable
CREATE TABLE "public"."Zone" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Zone_orgId_idx" ON "public"."Zone"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_orgId_name_key" ON "public"."Zone"("orgId", "name");

-- CreateIndex
CREATE INDEX "Table_zoneId_idx" ON "public"."Table"("zoneId");

-- AddForeignKey
ALTER TABLE "public"."Zone" ADD CONSTRAINT "Zone_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Table" ADD CONSTRAINT "Table_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "public"."Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
