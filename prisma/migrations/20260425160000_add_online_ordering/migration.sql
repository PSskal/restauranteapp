-- CreateEnum
CREATE TYPE "public"."OrderKind" AS ENUM ('DINE_IN', 'PICKUP', 'DELIVERY');

-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onlineOrderingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pickupEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "kind" "public"."OrderKind" NOT NULL DEFAULT 'DINE_IN',
ADD COLUMN     "pickupTime" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_orgId_kind_status_idx" ON "public"."Order"("orgId", "kind", "status");
