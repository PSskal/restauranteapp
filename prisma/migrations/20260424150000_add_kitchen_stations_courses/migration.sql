-- AlterTable
ALTER TABLE "public"."MenuItem" ADD COLUMN     "prepMinutes" INTEGER,
ADD COLUMN     "stationId" TEXT;

-- AlterTable
ALTER TABLE "public"."OrderItem" ADD COLUMN     "courseNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "firedAt" TIMESTAMP(3),
ADD COLUMN     "prepMinutes" INTEGER,
ADD COLUMN     "stationId" TEXT;

-- CreateTable
CREATE TABLE "public"."KitchenStation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenStation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KitchenStation_orgId_idx" ON "public"."KitchenStation"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenStation_orgId_name_key" ON "public"."KitchenStation"("orgId", "name");

-- CreateIndex
CREATE INDEX "MenuItem_stationId_idx" ON "public"."MenuItem"("stationId");

-- CreateIndex
CREATE INDEX "OrderItem_stationId_status_idx" ON "public"."OrderItem"("stationId", "status");

-- AddForeignKey
ALTER TABLE "public"."KitchenStation" ADD CONSTRAINT "KitchenStation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItem" ADD CONSTRAINT "MenuItem_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."KitchenStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."KitchenStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
