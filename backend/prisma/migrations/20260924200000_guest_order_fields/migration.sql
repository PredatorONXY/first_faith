-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "addressId" DROP NOT NULL;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "guestToken" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Order_guestToken_key" ON "Order"("guestToken");
CREATE INDEX IF NOT EXISTS "Order_guestToken_idx" ON "Order"("guestToken");
