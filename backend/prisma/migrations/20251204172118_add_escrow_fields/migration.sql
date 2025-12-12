-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "escrowContractAddress" TEXT,
ADD COLUMN     "escrowDepositBlock" INTEGER,
ADD COLUMN     "escrowDepositTxHash" TEXT,
ADD COLUMN     "escrowRefundBlock" INTEGER,
ADD COLUMN     "escrowRefundTxHash" TEXT,
ADD COLUMN     "escrowReleaseBlock" INTEGER,
ADD COLUMN     "escrowReleaseTxHash" TEXT;

-- CreateIndex
CREATE INDEX "Delivery_escrowContractAddress_idx" ON "Delivery"("escrowContractAddress");
