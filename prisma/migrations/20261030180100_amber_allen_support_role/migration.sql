-- Amber Allen was invited for event support. Move her off Overseer now that Support exists.

UPDATE "users"
SET role = 'SUPPORT', "updatedAt" = CURRENT_TIMESTAMP
WHERE email = 'ambera1027@gmail.com'
  AND role = 'OVERSEER';

UPDATE "event_permissions"
SET role = 'SUPPORT', "updatedAt" = CURRENT_TIMESTAMP
WHERE "userId" = '4103c49b-8f9d-4b68-96cf-b1cbfdc746b3'
  AND role = 'COORDINATOR';
