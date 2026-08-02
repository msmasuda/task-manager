-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('AUTO_CONFIRM', 'MANUAL_CONFIRM');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('WEB', 'PHONE', 'WALK_IN', 'STAFF');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('PRIMARY', 'SUPPORT');

-- CreateEnum
CREATE TYPE "ScheduleExceptionType" AS ENUM ('CLOSED', 'SPECIAL_HOURS');

-- CreateEnum
CREATE TYPE "TimeOffType" AS ENUM ('BREAK', 'PAID_LEAVE', 'SICK_LEAVE', 'OTHER');

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "defaultTimeZone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("organizationId","userId")
);

-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "email" TEXT,
    "phone" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bookingMode" "BookingMode" NOT NULL DEFAULT 'MANUAL_CONFIRM',
    "slotIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "minLeadTimeMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 90,
    "cancellationDeadlineMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationMember" (
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPubliclyBookable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationMember_pkey" PRIMARY KEY ("locationId","userId")
);

-- CreateTable
CREATE TABLE "BusinessHours" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "BusinessHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationScheduleException" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "ScheduleExceptionType" NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "note" TEXT,

    CONSTRAINT "LocationScheduleException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSchedule" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "StaffSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffTimeOff" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "type" "TimeOffType" NOT NULL,
    "note" TEXT,

    CONSTRAINT "StaffTimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "priceAmount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "requiredStaffCount" INTEGER NOT NULL DEFAULT 1,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceStaff" (
    "serviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPubliclyBookable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceStaff_pkey" PRIMARY KEY ("serviceId","userId")
);

-- CreateTable
CREATE TABLE "ResourceType" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ResourceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "resourceTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceResourceRequirement" (
    "serviceId" TEXT NOT NULL,
    "resourceTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ServiceResourceRequirement_pkey" PRIMARY KEY ("serviceId","resourceTypeId")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKana" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "note" TEXT,
    "marketingConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "source" "AppointmentSource" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "occupancyStartAt" TIMESTAMP(3) NOT NULL,
    "occupancyEndAt" TIMESTAMP(3) NOT NULL,
    "serviceNameSnapshot" TEXT NOT NULL,
    "durationMinutesSnapshot" INTEGER NOT NULL,
    "priceAmountSnapshot" INTEGER,
    "currencySnapshot" TEXT NOT NULL,
    "preferredStaffId" TEXT,
    "customerNote" TEXT,
    "internalNote" TEXT,
    "managementTokenHash" TEXT NOT NULL,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentAssignment" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AssignmentType" NOT NULL DEFAULT 'PRIMARY',
    "occupancyStartAt" TIMESTAMP(3) NOT NULL,
    "occupancyEndAt" TIMESTAMP(3) NOT NULL,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceReservation" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "occupancyStartAt" TIMESTAMP(3) NOT NULL,
    "occupancyEndAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentStatusHistory" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fromStatus" "AppointmentStatus",
    "toStatus" "AppointmentStatus" NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "locationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expires_idx" ON "Session"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "UserToken_tokenHash_key" ON "UserToken"("tokenHash");

-- CreateIndex
CREATE INDEX "UserToken_userId_purpose_idx" ON "UserToken"("userId", "purpose");

-- CreateIndex
CREATE INDEX "UserToken_expiresAt_idx" ON "UserToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_isActive_idx" ON "OrganizationMember"("userId", "isActive");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_role_idx" ON "OrganizationMember"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_tokenHash_key" ON "OrganizationInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationId_email_idx" ON "OrganizationInvitation"("organizationId", "email");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_expiresAt_idx" ON "OrganizationInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "Location_organizationId_idx" ON "Location"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_organizationId_slug_key" ON "Location"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "LocationMember_userId_idx" ON "LocationMember"("userId");

-- CreateIndex
CREATE INDEX "BusinessHours_locationId_dayOfWeek_idx" ON "BusinessHours"("locationId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "LocationScheduleException_locationId_date_idx" ON "LocationScheduleException"("locationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LocationScheduleException_locationId_date_key" ON "LocationScheduleException"("locationId", "date");

-- CreateIndex
CREATE INDEX "StaffSchedule_locationId_dayOfWeek_idx" ON "StaffSchedule"("locationId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "StaffSchedule_userId_dayOfWeek_idx" ON "StaffSchedule"("userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "StaffTimeOff_locationId_startAt_endAt_idx" ON "StaffTimeOff"("locationId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "StaffTimeOff_userId_startAt_endAt_idx" ON "StaffTimeOff"("userId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "Service_organizationId_locationId_isActive_idx" ON "Service"("organizationId", "locationId", "isActive");

-- CreateIndex
CREATE INDEX "ServiceStaff_userId_idx" ON "ServiceStaff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceType_organizationId_name_key" ON "ResourceType"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Resource_organizationId_locationId_resourceTypeId_idx" ON "Resource"("organizationId", "locationId", "resourceTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_locationId_name_key" ON "Resource"("locationId", "name");

-- CreateIndex
CREATE INDEX "Customer_organizationId_email_idx" ON "Customer"("organizationId", "email");

-- CreateIndex
CREATE INDEX "Customer_organizationId_phone_idx" ON "Customer"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "Customer_organizationId_name_idx" ON "Customer"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_managementTokenHash_key" ON "Appointment"("managementTokenHash");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_startAt_idx" ON "Appointment"("organizationId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_locationId_startAt_endAt_idx" ON "Appointment"("locationId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "Appointment_locationId_status_startAt_idx" ON "Appointment"("locationId", "status", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_customerId_startAt_idx" ON "Appointment"("customerId", "startAt");

-- CreateIndex
CREATE INDEX "AppointmentAssignment_userId_occupancyStartAt_occupancyEndA_idx" ON "AppointmentAssignment"("userId", "occupancyStartAt", "occupancyEndAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentAssignment_appointmentId_userId_key" ON "AppointmentAssignment"("appointmentId", "userId");

-- CreateIndex
CREATE INDEX "ResourceReservation_resourceId_occupancyStartAt_occupancyEn_idx" ON "ResourceReservation"("resourceId", "occupancyStartAt", "occupancyEndAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceReservation_appointmentId_resourceId_key" ON "ResourceReservation"("appointmentId", "resourceId");

-- CreateIndex
CREATE INDEX "AppointmentStatusHistory_appointmentId_changedAt_idx" ON "AppointmentStatusHistory"("appointmentId", "changedAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_entityType_entityId_idx" ON "AuditLog"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_locationId_createdAt_idx" ON "AuditLog"("locationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDelivery_idempotencyKey_key" ON "EmailDelivery"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailDelivery_status_createdAt_idx" ON "EmailDelivery"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToken" ADD CONSTRAINT "UserToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationMember" ADD CONSTRAINT "LocationMember_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationMember" ADD CONSTRAINT "LocationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessHours" ADD CONSTRAINT "BusinessHours_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationScheduleException" ADD CONSTRAINT "LocationScheduleException_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSchedule" ADD CONSTRAINT "StaffSchedule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSchedule" ADD CONSTRAINT "StaffSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTimeOff" ADD CONSTRAINT "StaffTimeOff_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTimeOff" ADD CONSTRAINT "StaffTimeOff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceStaff" ADD CONSTRAINT "ServiceStaff_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceStaff" ADD CONSTRAINT "ServiceStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceType" ADD CONSTRAINT "ResourceType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceResourceRequirement" ADD CONSTRAINT "ServiceResourceRequirement_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceResourceRequirement" ADD CONSTRAINT "ServiceResourceRequirement_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentAssignment" ADD CONSTRAINT "AppointmentAssignment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentAssignment" ADD CONSTRAINT "AppointmentAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReservation" ADD CONSTRAINT "ResourceReservation_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReservation" ADD CONSTRAINT "ResourceReservation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentStatusHistory" ADD CONSTRAINT "AppointmentStatusHistory_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentStatusHistory" ADD CONSTRAINT "AppointmentStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prevent overlapping staff and resource reservations at the database level.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "AppointmentAssignment"
ADD CONSTRAINT "AppointmentAssignment_user_occupancy_excl"
EXCLUDE USING gist (
    "userId" WITH =,
    tsrange("occupancyStartAt", "occupancyEndAt", '[)') WITH &&
);

ALTER TABLE "ResourceReservation"
ADD CONSTRAINT "ResourceReservation_resource_occupancy_excl"
EXCLUDE USING gist (
    "resourceId" WITH =,
    tsrange("occupancyStartAt", "occupancyEndAt", '[)') WITH &&
);
