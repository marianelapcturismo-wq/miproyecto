-- CreateEnum
CREATE TYPE "GoalMetric" AS ENUM ('OCUPACION', 'ADR', 'REVPAR', 'INGRESOS', 'CANCELACIONES', 'VENTA_DIRECTA_PCT');

-- CreateTable
CREATE TABLE "DailyHotelMetric" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "roomTypeId" TEXT,
    "totalRooms" INTEGER NOT NULL,
    "soldRoomNights" INTEGER NOT NULL,
    "roomRevenue" DECIMAL(12,2) NOT NULL,
    "otherRevenue" DECIMAL(12,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyHotelMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "metric" "GoalMetric" NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "targetValue" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyHotelMetric_hotelId_date_idx" ON "DailyHotelMetric"("hotelId", "date");

-- CreateIndex
CREATE INDEX "DailyHotelMetric_hotelId_roomTypeId_date_idx" ON "DailyHotelMetric"("hotelId", "roomTypeId", "date");

-- CreateIndex
CREATE INDEX "Goal_hotelId_metric_periodStart_idx" ON "Goal"("hotelId", "metric", "periodStart");

-- AddForeignKey
ALTER TABLE "DailyHotelMetric" ADD CONSTRAINT "DailyHotelMetric_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyHotelMetric" ADD CONSTRAINT "DailyHotelMetric_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

