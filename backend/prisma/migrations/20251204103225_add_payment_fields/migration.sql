/*
  Warnings:

  - A unique constraint covering the columns `[paymentTransactionHash]` on the table `Delivery` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'ESCROWED', 'PAID', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "buyerWalletAddress" TEXT,
ADD COLUMN     "paymentAmount" DOUBLE PRECISION,
ADD COLUMN     "paymentBlockNumber" INTEGER,
ADD COLUMN     "paymentError" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "paymentTransactionHash" TEXT,
ADD COLUMN     "sellerWalletAddress" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_paymentTransactionHash_key" ON "Delivery"("paymentTransactionHash");

-- CreateIndex
CREATE INDEX "Delivery_buyerWalletAddress_idx" ON "Delivery"("buyerWalletAddress");

-- CreateIndex
CREATE INDEX "Delivery_sellerWalletAddress_idx" ON "Delivery"("sellerWalletAddress");

-- CreateIndex
CREATE INDEX "Delivery_paymentStatus_idx" ON "Delivery"("paymentStatus");
