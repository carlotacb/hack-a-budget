-- The General department must always exist.
INSERT INTO "Department" ("id", "code", "name", "active", "createdAt", "updatedAt")
VALUES ('department_general', 'general', 'General', true, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;
