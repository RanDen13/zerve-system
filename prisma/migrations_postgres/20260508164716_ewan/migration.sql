-- AlterTable
ALTER TABLE "_EventSpaceAmenities" ADD CONSTRAINT "_EventSpaceAmenities_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_EventSpaceAmenities_AB_unique";

-- CreateTable
CREATE TABLE "playing_with_neon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" REAL,

    CONSTRAINT "playing_with_neon_pkey" PRIMARY KEY ("id")
);
