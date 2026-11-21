/**
 * Phase 2: Analyze Events and Templates
 * 
 * This script analyzes all events and their department templates to understand:
 * 1. How many events use department templates
 * 2. What module configurations exist in templates
 * 3. What terminology overrides exist
 * 4. Which events already have settings
 * 5. Which events need migration
 */

import { PrismaClient } from '@/generated/prisma/client'

const prisma = new PrismaClient()

interface AnalysisResult {
  totalEvents: number
  eventsWithTemplate: number
  eventsWithoutTemplate: number
  eventsWithSettings: number
  eventsNeedingMigration: number
  templateBreakdown: {
    templateId: string
    templateName: string
    eventCount: number
    moduleConfig: any
    terminology: any
  }[]
  eventsToMigrate: {
    eventId: string
    eventName: string
    templateId: string
    templateName: string
    currentSettings: any
  }[]
}

async function analyzeEventsAndTemplates(): Promise<AnalysisResult> {
  console.log('🔍 Analyzing events and templates...\n')

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

  // Get all department templates
  const templates = await prisma.department_templates.findMany({
    select: {
      id: true,
      name: true,
      moduleConfig: true,
      terminology: true,
      _count: {
        select: {
          events: true
        }
      }
    }
  })

  const totalEvents = events.length
  const eventsWithTemplate = events.filter(e => e.departmentTemplateId).length
  const eventsWithoutTemplate = events.filter(e => !e.departmentTemplateId).length
  const eventsWithSettings = events.filter(e => e.settings && typeof e.settings === 'object').length
  
  // Events that have a template but no settings (need migration)
  const eventsNeedingMigration = events.filter(e => 
    e.departmentTemplateId && (!e.settings || typeof e.settings !== 'object')
  ).length

  // Template breakdown
  const templateBreakdown = templates.map(t => ({
    templateId: t.id,
    templateName: t.name,
    eventCount: t._count.events,
    moduleConfig: t.moduleConfig,
    terminology: t.terminology
  }))

  // Events to migrate (with details)
  const eventsToMigrate = events
    .filter(e => e.departmentTemplateId && (!e.settings || typeof e.settings !== 'object'))
    .map(e => ({
      eventId: e.id,
      eventName: e.name,
      templateId: e.departmentTemplateId!,
      templateName: e.departmentTemplate?.name || 'Unknown',
      currentSettings: e.settings
    }))

  return {
    totalEvents,
    eventsWithTemplate,
    eventsWithoutTemplate,
    eventsWithSettings,
    eventsNeedingMigration,
    templateBreakdown,
    eventsToMigrate
  }
}

async function main() {
  try {
    const analysis = await analyzeEventsAndTemplates()

    console.log('📊 ANALYSIS RESULTS')
    console.log('='.repeat(80))
    console.log(`Total Events: ${analysis.totalEvents}`)
    console.log(`Events with Template: ${analysis.eventsWithTemplate}`)
    console.log(`Events without Template: ${analysis.eventsWithoutTemplate}`)
    console.log(`Events with Settings: ${analysis.eventsWithSettings}`)
    console.log(`Events Needing Migration: ${analysis.eventsNeedingMigration}`)
    console.log('='.repeat(80))
    console.log()

    console.log('📋 TEMPLATE BREAKDOWN')
    console.log('='.repeat(80))
    analysis.templateBreakdown.forEach(t => {
      console.log(`\n${t.templateName} (${t.templateId})`)
      console.log(`  Events using this template: ${t.eventCount}`)
      console.log(`  Module Config:`, JSON.stringify(t.moduleConfig, null, 2))
      console.log(`  Terminology:`, JSON.stringify(t.terminology, null, 2))
    })
    console.log('='.repeat(80))
    console.log()

    if (analysis.eventsToMigrate.length > 0) {
      console.log('🔄 EVENTS TO MIGRATE')
      console.log('='.repeat(80))
      analysis.eventsToMigrate.forEach((e, i) => {
        console.log(`\n${i + 1}. ${e.eventName} (${e.eventId})`)
        console.log(`   Template: ${e.templateName} (${e.templateId})`)
        console.log(`   Current Settings:`, e.currentSettings || 'null')
      })
      console.log('='.repeat(80))
    } else {
      console.log('✅ No events need migration - all events already have settings!')
    }

    // Save analysis to file for reference
    const fs = require('fs')
    const path = require('path')
    const outputPath = path.join(__dirname, 'migration-analysis.json')
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2))
    console.log(`\n💾 Analysis saved to: ${outputPath}`)

  } catch (error) {
    console.error('❌ Error analyzing events:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
