-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "encounterId" TEXT,
ADD COLUMN     "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "total" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "LabTest" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "encounterId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "orderedBy" TEXT,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "testCategory" TEXT;

-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN     "batchNumber" TEXT,
ADD COLUMN     "dosage" TEXT,
ADD COLUMN     "form" TEXT,
ADD COLUMN     "genericName" TEXT,
ADD COLUMN     "isPrescriptionOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "reorderLevel" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "unitPrice" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientId" INTEGER NOT NULL,
    "doctorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "chiefComplaint" TEXT,
    "diagnosis" TEXT,
    "notes" TEXT,
    "vitalSigns" JSONB,
    "anatomyData" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "patientId" INTEGER NOT NULL,
    "doctorId" TEXT NOT NULL,
    "encounterId" TEXT,
    "appointmentId" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineId" TEXT,
    "medicineName" TEXT,
    "dosage" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_appointmentId_key" ON "Encounter"("appointmentId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
