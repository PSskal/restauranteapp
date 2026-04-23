-- CreateEnum
CREATE TYPE "public"."DiscountType" AS ENUM ('PERCENT', 'FIXED', 'COMP');

-- AlterTable
ALTER TABLE "public"."MenuItem" ADD COLUMN     "outOfStock" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "tipC" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."Discount" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "type" "public"."DiscountType" NOT NULL,
    "valueBp" INTEGER,
    "amountC" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "appliedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Discount_orderId_idx" ON "public"."Discount"("orderId");

-- CreateIndex
CREATE INDEX "Discount_orderItemId_idx" ON "public"."Discount"("orderItemId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "public"."Payment"("orderId");

-- AddForeignKey
ALTER TABLE "public"."Discount" ADD CONSTRAINT "Discount_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Discount" ADD CONSTRAINT "Discount_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "public"."OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Discount" ADD CONSTRAINT "Discount_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
