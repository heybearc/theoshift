-- AlterTable: Add Phase 3 configuration fields to department_templates
-- These fields enable template-driven event configuration

-- Add module configuration field (JSON)
-- Stores which modules are enabled: countTimes, lanyards, positions, customFields
ALTER TABLE "department_templates" ADD COLUMN "moduleConfig" JSONB;

-- Add terminology overrides field (JSON)
-- Stores custom labels: volunteer, position, shift, assignment
ALTER TABLE "department_templates" ADD COLUMN "terminology" JSONB;

-- Add position templates field (JSON)
-- Stores pre-configured position templates for quick event setup
ALTER TABLE "department_templates" ADD COLUMN "positionTemplates" JSONB;

-- Add comments for documentation
COMMENT ON COLUMN "department_templates"."moduleConfig" IS 'Phase 3: Module configuration - toggles for countTimes, lanyards, positions, and custom fields';
COMMENT ON COLUMN "department_templates"."terminology" IS 'Phase 3: Terminology overrides - custom labels for volunteer, position, shift, assignment';
COMMENT ON COLUMN "department_templates"."positionTemplates" IS 'Phase 3: Position templates - pre-configured positions for quick event setup';
