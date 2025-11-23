-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Configuration_category_idx" ON "Configuration"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_category_key_key" ON "Configuration"("category", "key");
