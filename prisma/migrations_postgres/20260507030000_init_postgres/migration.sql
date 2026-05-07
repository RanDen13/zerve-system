-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EventSpaceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE');

-- CreateEnum
CREATE TYPE "SAPFRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'RETURNED_FOR_REVISION', 'REJECTED', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStepStatus" AS ENUM ('PENDING', 'ACTIVE', 'APPROVED', 'RETURNED', 'REJECTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ApprovalActionType" AS ENUM ('SUBMITTED', 'RESUBMITTED', 'APPROVED', 'RETURNED', 'REJECTED', 'COMMENTED', 'FINALIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApproverPosition" AS ENUM ('ADVISER', 'DEAN', 'SDS', 'SAS', 'ADDITIONAL_SIGNATORY', 'VPAA_ASSISTANT', 'VPAA', 'UNIVERSITY_PRESIDENT');

-- CreateEnum
CREATE TYPE "ConcernThreadStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REQUEST', 'APPROVAL', 'REVISION', 'REJECTION', 'CONFLICT', 'FINAL', 'COMMENT');

-- CreateEnum
CREATE TYPE "SAPFChangeRequestType" AS ENUM ('EDIT', 'CANCEL');

-- CreateEnum
CREATE TYPE "SAPFChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OFFICER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "TutorialProgressStatus" AS ENUM ('STARTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tutorial_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "TutorialProgressStatus" NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_tutorial_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_space" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" "EventSpaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "image" BYTEA,

    CONSTRAINT "event_space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_space_image" (
    "id" TEXT NOT NULL,
    "eventSpaceId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_space_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventSpaceId" TEXT,

    CONSTRAINT "amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sapf_request" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "submissionKey" TEXT,
    "officerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "departmentCategory" TEXT,
    "department" TEXT NOT NULL,
    "attendeeCount" TEXT NOT NULL,
    "status" "SAPFRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStepOrder" INTEGER,
    "conflictWarning" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "modality" TEXT,
    "programCourse" TEXT,
    "venue" TEXT,
    "setting" TEXT,
    "offCampAgree" TEXT,
    "personnelInCharge" TEXT,
    "activityType" TEXT,
    "attire" TEXT,
    "scope" TEXT,
    "program" TEXT,
    "rationale" TEXT,
    "objectives" TEXT,
    "programFlow" TEXT,
    "emergencyPlan" TEXT,
    "budget" TEXT,
    "sourceOfBudget" TEXT,
    "budgetDetails" TEXT,
    "vehiclePassengers" TEXT,
    "foodPax" TEXT,
    "roomVenueDetails" TEXT,
    "microphoneQty" TEXT,
    "extraProvisions" TEXT,
    "otherSupport" TEXT,
    "otherDetails" TEXT,
    "parentsConsent" BOOLEAN,
    "hasAttachments" BOOLEAN,
    "academicInterruption" BOOLEAN,
    "academicInterruptionRemarks" TEXT,
    "medicalExam" BOOLEAN,
    "reportOfCompliance" BOOLEAN,
    "studentPersonnelRatio" TEXT,
    "conductedRemarks" TEXT,
    "cancelledRemarks" TEXT,
    "verificationToken" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sapf_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sapf_request_schedule" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sapf_request_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sapf_request_venue" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "eventSpaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sapf_request_venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sapf_attachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'SDS_CLEARANCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sapf_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sapf_core_value" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sapf_core_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sapf_graduate_attribute" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sapf_graduate_attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sapf_support_request" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sapf_support_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_step" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "position" "ApproverPosition" NOT NULL,
    "label" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "ApprovalStepStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "actedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_action" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "stepId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" "ApprovalActionType" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sapf_activity_log" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sapf_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sapf_change_request" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "type" "SAPFChangeRequestType" NOT NULL,
    "status" "SAPFChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "resolutionComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "sapf_change_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approver_position_user" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" "ApproverPosition" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approver_position_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_block" (
    "id" TEXT NOT NULL,
    "eventSpaceId" TEXT,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_block_schedule" (
    "id" TEXT NOT NULL,
    "venueBlockId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_block_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'REQUEST',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concern_thread" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "approvalStepId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "ConcernThreadStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concern_thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concern_message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concern_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "title" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'SYSTEM',
    "smtpHost" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
    "smtpPort" INTEGER NOT NULL DEFAULT 465,
    "smtpUser" TEXT NOT NULL DEFAULT '',
    "smtpPass" TEXT NOT NULL DEFAULT '',
    "senderEmail" TEXT NOT NULL DEFAULT '',
    "senderName" TEXT NOT NULL DEFAULT 'Zerve',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_tutorial_progress_status_idx" ON "user_tutorial_progress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_tutorial_progress_userId_role_key" ON "user_tutorial_progress"("userId", "role");

-- CreateIndex
CREATE INDEX "event_space_image_eventSpaceId_idx" ON "event_space_image"("eventSpaceId");

-- CreateIndex
CREATE UNIQUE INDEX "sapf_request_requestNumber_key" ON "sapf_request"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sapf_request_submissionKey_key" ON "sapf_request"("submissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "sapf_request_verificationToken_key" ON "sapf_request"("verificationToken");

-- CreateIndex
CREATE INDEX "sapf_request_officerId_idx" ON "sapf_request"("officerId");

-- CreateIndex
CREATE INDEX "sapf_request_status_idx" ON "sapf_request"("status");

-- CreateIndex
CREATE INDEX "sapf_request_schedule_requestId_idx" ON "sapf_request_schedule"("requestId");

-- CreateIndex
CREATE INDEX "sapf_request_schedule_startAt_idx" ON "sapf_request_schedule"("startAt");

-- CreateIndex
CREATE INDEX "sapf_request_venue_eventSpaceId_idx" ON "sapf_request_venue"("eventSpaceId");

-- CreateIndex
CREATE UNIQUE INDEX "sapf_request_venue_requestId_eventSpaceId_key" ON "sapf_request_venue"("requestId", "eventSpaceId");

-- CreateIndex
CREATE INDEX "sapf_attachment_requestId_idx" ON "sapf_attachment"("requestId");

-- CreateIndex
CREATE INDEX "sapf_attachment_purpose_idx" ON "sapf_attachment"("purpose");

-- CreateIndex
CREATE INDEX "sapf_core_value_requestId_idx" ON "sapf_core_value"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "sapf_core_value_requestId_value_key" ON "sapf_core_value"("requestId", "value");

-- CreateIndex
CREATE INDEX "sapf_graduate_attribute_requestId_idx" ON "sapf_graduate_attribute"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "sapf_graduate_attribute_requestId_value_key" ON "sapf_graduate_attribute"("requestId", "value");

-- CreateIndex
CREATE INDEX "sapf_support_request_requestId_idx" ON "sapf_support_request"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "sapf_support_request_requestId_value_key" ON "sapf_support_request"("requestId", "value");

-- CreateIndex
CREATE INDEX "approval_step_reviewerId_idx" ON "approval_step"("reviewerId");

-- CreateIndex
CREATE INDEX "approval_step_status_idx" ON "approval_step"("status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_step_requestId_stepOrder_key" ON "approval_step"("requestId", "stepOrder");

-- CreateIndex
CREATE INDEX "approval_action_requestId_idx" ON "approval_action"("requestId");

-- CreateIndex
CREATE INDEX "approval_action_actorId_idx" ON "approval_action"("actorId");

-- CreateIndex
CREATE INDEX "sapf_activity_log_requestId_idx" ON "sapf_activity_log"("requestId");

-- CreateIndex
CREATE INDEX "sapf_activity_log_actorId_idx" ON "sapf_activity_log"("actorId");

-- CreateIndex
CREATE INDEX "sapf_activity_log_action_idx" ON "sapf_activity_log"("action");

-- CreateIndex
CREATE INDEX "sapf_change_request_requestId_idx" ON "sapf_change_request"("requestId");

-- CreateIndex
CREATE INDEX "sapf_change_request_requestedById_idx" ON "sapf_change_request"("requestedById");

-- CreateIndex
CREATE INDEX "sapf_change_request_reviewedById_idx" ON "sapf_change_request"("reviewedById");

-- CreateIndex
CREATE INDEX "sapf_change_request_status_idx" ON "sapf_change_request"("status");

-- CreateIndex
CREATE INDEX "approver_position_user_position_idx" ON "approver_position_user"("position");

-- CreateIndex
CREATE UNIQUE INDEX "approver_position_user_userId_position_key" ON "approver_position_user"("userId", "position");

-- CreateIndex
CREATE INDEX "venue_block_eventSpaceId_idx" ON "venue_block"("eventSpaceId");

-- CreateIndex
CREATE INDEX "venue_block_schedule_venueBlockId_idx" ON "venue_block_schedule"("venueBlockId");

-- CreateIndex
CREATE INDEX "venue_block_schedule_startAt_idx" ON "venue_block_schedule"("startAt");

-- CreateIndex
CREATE INDEX "notification_userId_idx" ON "notification"("userId");

-- CreateIndex
CREATE INDEX "notification_requestId_idx" ON "notification"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "concern_thread_approvalStepId_key" ON "concern_thread"("approvalStepId");

-- CreateIndex
CREATE INDEX "concern_thread_requestId_idx" ON "concern_thread"("requestId");

-- CreateIndex
CREATE INDEX "concern_thread_officerId_idx" ON "concern_thread"("officerId");

-- CreateIndex
CREATE INDEX "concern_thread_reviewerId_idx" ON "concern_thread"("reviewerId");

-- CreateIndex
CREATE INDEX "concern_message_threadId_idx" ON "concern_message"("threadId");

-- CreateIndex
CREATE INDEX "concern_message_authorId_idx" ON "concern_message"("authorId");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- AddForeignKey
ALTER TABLE "user_tutorial_progress" ADD CONSTRAINT "user_tutorial_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_space_image" ADD CONSTRAINT "event_space_image_eventSpaceId_fkey" FOREIGN KEY ("eventSpaceId") REFERENCES "event_space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amenity" ADD CONSTRAINT "amenity_eventSpaceId_fkey" FOREIGN KEY ("eventSpaceId") REFERENCES "event_space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapf_request" ADD CONSTRAINT "sapf_request_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapf_request_schedule" ADD CONSTRAINT "sapf_request_schedule_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapf_request_venue" ADD CONSTRAINT "sapf_request_venue_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapf_request_venue" ADD CONSTRAINT "sapf_request_venue_eventSpaceId_fkey" FOREIGN KEY ("eventSpaceId") REFERENCES "event_space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapf_attachment" ADD CONSTRAINT "sapf_attachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapf_core_value" ADD CONSTRAINT "sapf_core_value_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapf_graduate_attribute" ADD CONSTRAINT "sapf_graduate_attribute_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapf_support_request" ADD CONSTRAINT "sapf_support_request_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_step" ADD CONSTRAINT "approval_step_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_step" ADD CONSTRAINT "approval_step_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_action" ADD CONSTRAINT "approval_action_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_action" ADD CONSTRAINT "approval_action_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "approval_step"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_action" ADD CONSTRAINT "approval_action_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapf_activity_log" ADD CONSTRAINT "sapf_activity_log_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapf_activity_log" ADD CONSTRAINT "sapf_activity_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapf_change_request" ADD CONSTRAINT "sapf_change_request_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapf_change_request" ADD CONSTRAINT "sapf_change_request_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapf_change_request" ADD CONSTRAINT "sapf_change_request_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approver_position_user" ADD CONSTRAINT "approver_position_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_block" ADD CONSTRAINT "venue_block_eventSpaceId_fkey" FOREIGN KEY ("eventSpaceId") REFERENCES "event_space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_block" ADD CONSTRAINT "venue_block_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_block_schedule" ADD CONSTRAINT "venue_block_schedule_venueBlockId_fkey" FOREIGN KEY ("venueBlockId") REFERENCES "venue_block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concern_thread" ADD CONSTRAINT "concern_thread_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "sapf_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concern_thread" ADD CONSTRAINT "concern_thread_approvalStepId_fkey" FOREIGN KEY ("approvalStepId") REFERENCES "approval_step"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concern_thread" ADD CONSTRAINT "concern_thread_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concern_thread" ADD CONSTRAINT "concern_thread_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concern_message" ADD CONSTRAINT "concern_message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "concern_thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concern_message" ADD CONSTRAINT "concern_message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
