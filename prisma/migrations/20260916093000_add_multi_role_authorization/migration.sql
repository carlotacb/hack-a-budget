-- Preserve the full access previously granted to organizers before introducing
-- the new, restricted ORGANIZER and DIRECTOR roles.
UPDATE "User"
SET "role" = 'ADMIN'
WHERE "role" = 'ORGANIZER';
