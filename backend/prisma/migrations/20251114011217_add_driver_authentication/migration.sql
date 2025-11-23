-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Driver_driverId_key" ON "Driver"("driverId");

-- CreateIndex
CREATE INDEX "Driver_driverId_idx" ON "Driver"("driverId");
