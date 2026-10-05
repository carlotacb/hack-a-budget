-- Adds a configurable display color to departments, used for tags shown
-- on budget categories (and anywhere else departments are listed).
ALTER TABLE "Department" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#64748b';
