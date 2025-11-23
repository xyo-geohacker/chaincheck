-- CreateTable
CREATE TABLE "ConfigurationUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigurationUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfigurationUser_username_key" ON "ConfigurationUser"("username");

-- CreateIndex
CREATE INDEX "ConfigurationUser_username_idx" ON "ConfigurationUser"("username");
