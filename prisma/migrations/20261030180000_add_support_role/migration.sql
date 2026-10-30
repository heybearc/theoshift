-- Support: sisters can sign in and help on an event without an overseer or keyman role.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPPORT';
ALTER TYPE "EventPermissionRole" ADD VALUE IF NOT EXISTS 'SUPPORT';
