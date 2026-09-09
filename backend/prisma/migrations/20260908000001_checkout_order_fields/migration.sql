-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'COD';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentMethod" "PaymentProvider" NOT NULL DEFAULT 'COD',
ADD COLUMN "shippingAddress" JSONB;
