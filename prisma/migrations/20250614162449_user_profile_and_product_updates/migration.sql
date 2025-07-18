/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('SALE', 'RENT');

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "categoryId",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'Другое',
ADD COLUMN     "listingType" "ListingType" NOT NULL DEFAULT 'SALE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "phoneNumber" TEXT;

-- DropTable
DROP TABLE "Category";
