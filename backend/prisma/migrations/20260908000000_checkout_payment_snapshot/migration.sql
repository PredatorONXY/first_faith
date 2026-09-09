-- Add cash on delivery and immutable shipping snapshots for checkout.
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'COD';

ALTER TABLE "Order"
  ADD COLUMN "paymentMethod" "PaymentProvider" NOT NULL DEFAULT 'COD',
  ADD COLUMN "shippingAddress" JSONB;
