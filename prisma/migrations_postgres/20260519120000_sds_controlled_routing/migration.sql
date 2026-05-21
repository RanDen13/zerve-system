-- AlterEnum
ALTER TYPE "ApprovalActionType" ADD VALUE 'ROUTED';
ALTER TYPE "ApprovalActionType" ADD VALUE 'RECOMMENDED_ROUTE';

-- AlterTable
ALTER TABLE "approval_step" ADD COLUMN "finalizesRequest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sapf_request"
ADD COLUMN "suggestedRoutePosition" "ApproverPosition",
ADD COLUMN "suggestedRouteReason" TEXT,
ADD COLUMN "suggestedRouteById" TEXT,
ADD COLUMN "suggestedRouteAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "sapf_request_suggestedRouteById_idx" ON "sapf_request"("suggestedRouteById");

-- AddForeignKey
ALTER TABLE "sapf_request" ADD CONSTRAINT "sapf_request_suggestedRouteById_fkey" FOREIGN KEY ("suggestedRouteById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
