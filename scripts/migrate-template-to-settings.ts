/**
 * Phase 2: Migrate Template Configurations to Event Settings
 * 
 * This script migrates department template configurations to event.settings:
 * 1. For events with templates that have moduleConfig - copy it
 * 2. For events with templates that have NULL moduleConfig - use defaults
 * 3. For events without templates - use defaults
 * 4. Preserve any existing settings (don't overwrite)
 * 5. Copy terminology overrides from templates
 */

import { PrismaClient } from '@/generated/prisma/client'

const prisma = new PrismaClient()

interface MigrationResult {
  totalProcessed: number
  migrated: number
  skipped: number
  errors: number
  details: {
    eventId: string
    eventName: string
    action: 'migrated' | 'skipped' | 'error'
    reason: string
    oldSettings: any
    newSettings: any
  }[]
}

// Default module configuration (all enabled)
const DEFAULT_MODULES = {
  countTimes: true,
  lanyards: true,
  ivsModule: false,
  positions: true,
  documents: true,
  announcements: true
}

// Default terminology
const DEFAULT_TERMINOLOGY = {
  volunteer: 'Volunteer',
  position: 'Position',
  shift: 'Shift',
  assignment: 'Assignment'
}

async function migrateEvent(
  event: any,
  dryRun: boolean = true
): Promise<MigrationResult['details'][0]> {
  const eventId = event.id
  const eventName = event.name
  const existingSettings = event.settings
  
  // Skip if event already has settings with modules
  if (existingSettings && typeof existingSettings === 'object' && existingSettings.modules) {
    return {
      eventId,
      eventName,
      action: 'skipped',
      reason: 'Event already has settings.modules configured',
      oldSettings: existingSettings,
      newSettings: existingSettings
    }
  }

  // Determine modules and terminology
  let modules = { ...DEFAULT_MODULES }
  let terminology = { ...DEFAULT_TERMINOLOGY }

  if (event.departmentTemplate) {
    const template = event.departmentTemplate
    
    // If template has moduleConfig, use it
    if (template.moduleConfig && typeof template.moduleConfig === 'object') {
      const templateModules = template.moduleConfig
      
      // Map template moduleConfig to our settings.modules format
      modules = {
        countTimes: templateModules.countTimes ?? DEFAULT_MODULES.countTimes,
        lanyards: templateModules.lanyards ?? DEFAULT_MODULES.lanyards,
        ivsModule: templateModules.ivsModule ?? DEFAULT_MODULES.ivsModule,
        positions: templateModules.positions ?? DEFAULT_MODULES.positions,
        // Documents and announcements weren't in old templates, default to true
        documents: DEFAULT_MODULES.documents,
        announcements: DEFAULT_MODULES.announcements
      }
    }
    
    // If template has terminology, use it
    if (template.terminology && typeof template.terminology === 'object') {
      terminology = {
        volunteer: template.terminology.volunteer || DEFAULT_TERMINOLOGY.volunteer,
        position: template.terminology.position || DEFAULT_TERMINOLOGY.position,
        shift: template.terminology.shift || DEFAULT_TERMINOLOGY.shift,
        assignment: template.terminology.assignment || DEFAULT_TERMINOLOGY.assignment
      }
    }
  }

  // Build new settings object
  const newSettings = {
    modules,
    terminology,
    // Preserve any existing custom fields or module overrides
    ...(existingSettings?.customFields && { customFields: existingSettings.customFields }),
    ...(existingSettings?.moduleOverrides && { moduleOverrides: existingSettings.moduleOverrides })
  }

  // Update event if not dry run
  if (!dryRun) {
    try {
      await prisma.events.update({
        where: { id: eventId },
        data: { settings: newSettings }
      })
    } catch (error) {
      return {
        eventId,
        eventName,
        action: 'error',
        reason: `Failed to update: ${error.message}`,
        oldSettings: existingSettings,
        newSettings: null
      }
    }
  }

  return {
    eventId,
    eventName,
    action: 'migrated',
    reason: event.departmentTemplate 
      ? `Migrated from template: ${event.departmentTemplate.name}`
      : 'Applied default settings (no template)',
    oldSettings: existingSettings,
    newSettings
  }
}

async function migrateAllEvents(dryRun: boolean = true): Promise<MigrationResult> {
  console.log(`🔄 ${dryRun ? 'DRY RUN - ' : ''}Migrating events...\n`)

  // Get all events with their templates
  const events = await prisma.events.findMany({
    include: {
      departmentTemplate: {
        select: {
          id: true,
          name: true,
          moduleConfig: true,
          terminology: true
        }
      }
    }
  })

  const result: MigrationResult = {
    totalProcessed: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    details: []
  }

  for (const event of events) {
    const detail = await migrateEvent(event, dryRun)
    result.details.push(detail)
    result.totalProcessed++
    
    if (detail.action === 'migrated') result.migrated++
    else if (detail.action === 'skipped') result.skipped++
    else if (detail.action === 'error') result.errors++
  }

  return result
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--execute')

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made')
    console.log('   Run with --execute to apply changes\n')
  } else {
    console.log('🚀 EXECUTION MODE - Changes will be applied!\n')
  }

  try {
    const result = await migrateAllEvents(dryRun)

    console.log('📊 MIGRATION RESULTS')
    console.log('='.repeat(80))
    console.log(`Total Events Processed: ${result.totalProcessed}`)
    console.log(`Migrated: ${result.migrated}`)
    console.log(`Skipped: ${result.skipped}`)
    console.log(`Errors: ${result.errors}`)
    console.log('='.repeat(80))
    console.log()

    // Show details
    console.log('📋 MIGRATION DETAILS')
    console.log('='.repeat(80))
    result.details.forEach((detail, i) => {
      const icon = detail.action === 'migrated' ? '✅' : detail.action === 'skipped' ? '⏭️' : '❌'
      console.log(`\n${i + 1}. ${icon} ${detail.eventName}`)
      console.log(`   Action: ${detail.action}`)
      console.log(`   Reason: ${detail.reason}`)
      if (detail.action === 'migrated') {
        console.log(`   New Settings:`)
        console.log(`     Modules:`, JSON.stringify(detail.newSettings.modules, null, 2))
        console.log(`     Terminology:`, JSON.stringify(detail.newSettings.terminology, null, 2))
      }
    })
    console.log('='.repeat(80))

    // Save results to file
    const fs = require('fs')
    const path = require('path')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = dryRun ? 'migration-dryrun.json' : `migration-executed-${timestamp}.json`
    const outputPath = path.join(__dirname, filename)
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))
    console.log(`\n💾 Results saved to: ${outputPath}`)

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN - no changes were made')
      console.log('   Review the results and run with --execute to apply changes')
    } else {
      console.log('\n✅ Migration complete!')
    }

  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
