-- CreateEnum
CREATE TYPE "Diet" AS ENUM ('OMNIVORE', 'VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'HALAL', 'KOSHER', 'OTHER');

-- CreateEnum
CREATE TYPE "TShirtSize" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "diet" "Diet",
  ADD COLUMN "tshirtSize" "TShirtSize";

-- Existing city/major data doesn't map to the new enums, so it's dropped
-- along with the columns rather than attempting a lossy conversion.
ALTER TABLE "User"
  DROP COLUMN "city",
  DROP COLUMN "major";
