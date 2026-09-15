/**
 * Merge Duplicate Volunteer Records
 * 
 * This script implements D-TS-021: Global Volunteer Registry
 * 
 * Strategy:
 * 1. Find duplicate volunteers (same email or firstName+lastName+congregation)
 * 2. For each duplicate set, choose the "canonical" record:
 *    - Prefer record with userId (linked to system user)
 *    - Otherwise, prefer oldest record (first created)
 * 3. Migrate all event_volunteers references to canonical record
 * 4. Migrate all position_assignments references to canonical record
 * 5. Delete duplicate records
 * 6. Report results
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface VolunteerRecord {
  id: string
  userId: string | null
  firstName: string
  lastName: string
  email: string
  congregation: string
  createdAt: Date
}

interface DuplicateGroup {
  key: string
  volunteers: VolunteerRecord[]
  canonical: VolunteerRecord
  duplicates: VolunteerRecord[]
}

async function findDuplicatesByEmail(): Promise<Map<string, VolunteerRecord[]>> {
  const volunteers = await prisma.volunteers.findMany({
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      email: true,
      congregation: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' }
  })

  const groupedByEmail = new Map<string, VolunteerRecord[]>()
  
  for (const volunteer of volunteers) {
    const normalizedEmail = volunteer.email.toLowerCase().trim()
    if (!groupedByEmail.has(normalizedEmail)) {
      groupedByEmail.set(normalizedEmail, [])
    }
    groupedByEmail.get(normalizedEmail)!.push(volunteer)
  }

  // Filter to only duplicates (more than 1 record)
  const duplicates = new Map<string, VolunteerRecord[]>()
  for (const [email, records] of groupedByEmail.entries()) {
    if (records.length > 1) {
      duplicates.set(email, records)
    }
  }

  return duplicates
}

function chooseCanonicalRecord(records: VolunteerRecord[]): VolunteerRecord {
  // Priority:
  // 1. Has userId (linked to system user)
  // 2. Oldest record (first created)

  const withUserId = records.filter(r => r.userId !== null)
  if (withUserId.length > 0) {
    return withUserId[0]
  }

  // Already sorted by createdAt ascending, so first is oldest
  return records[0]
}

async function mergeDuplicates(duplicateGroups: Map<string, VolunteerRecord[]>): Promise<void> {
  console.log(`\n🔍 Found ${duplicateGroups.size} duplicate groups\n`)

  const groups: DuplicateGroup[] = []

  for (const [email, records] of duplicateGroups.entries()) {
    const canonical = chooseCanonicalRecord(records)
    const duplicates = records.filter(r => r.id !== canonical.id)

    groups.push({
      key: email,
      volunteers: records,
      canonical,
      duplicates
    })

    console.log(`📧 ${email}`)
    console.log(`   ✅ Canonical: ${canonical.firstName} ${canonical.lastName} (${canonical.id})`)
    console.log(`      - userId: ${canonical.userId || 'none'}`)
    console.log(`      - created: ${canonical.createdAt.toISOString()}`)
    console.log(`   ❌ Duplicates (${duplicates.length}):`)
    for (const dup of duplicates) {
      console.log(`      - ${dup.id} (created: ${dup.createdAt.toISOString()})`)
    }
    console.log()
  }

  // Ask for confirmation
  console.log(`\n⚠️  About to merge ${groups.length} duplicate groups`)
  console.log(`   This will update event_volunteers and position_assignments references`)
  console.log(`   and delete ${groups.reduce((sum, g) => sum + g.duplicates.length, 0)} duplicate records\n`)

  // Perform migration
  for (const group of groups) {
    console.log(`\n🔄 Merging ${group.key}...`)

    for (const duplicate of group.duplicates) {
      // Handle event_volunteers - check for conflicts first
      const duplicateEventVolunteers = await prisma.event_volunteers.findMany({
        where: { volunteerId: duplicate.id },
        select: { id: true, eventId: true }
      })

      const canonicalEventIds = await prisma.event_volunteers.findMany({
        where: { volunteerId: group.canonical.id },
        select: { eventId: true }
      }).then(records => new Set(records.map(r => r.eventId)))

      let migratedCount = 0
      let deletedCount = 0

      for (const ev of duplicateEventVolunteers) {
        if (canonicalEventIds.has(ev.eventId)) {
          // Canonical already linked to this event - delete duplicate
          await prisma.event_volunteers.delete({ where: { id: ev.id } })
          deletedCount++
        } else {
          // Canonical not linked to this event - migrate
          await prisma.event_volunteers.update({
            where: { id: ev.id },
            data: { volunteerId: group.canonical.id }
          })
          migratedCount++
        }
      }

      if (migratedCount > 0) {
        console.log(`   ✓ Migrated ${migratedCount} event_volunteers references`)
      }
      if (deletedCount > 0) {
        console.log(`   ✓ Deleted ${deletedCount} duplicate event_volunteers (canonical already linked)`)
      }

      // Migrate position_assignments (primary volunteer)
      const assignmentsCount = await prisma.position_assignments.updateMany({
        where: { volunteerId: duplicate.id },
        data: { volunteerId: group.canonical.id }
      })
      console.log(`   ✓ Migrated ${assignmentsCount.count} position_assignments references`)

      // Migrate position_assignments (keyman)
      const keymanCount = await prisma.position_assignments.updateMany({
        where: { keymanId: duplicate.id },
        data: { keymanId: group.canonical.id }
      })
      if (keymanCount.count > 0) {
        console.log(`   ✓ Migrated ${keymanCount.count} keyman references`)
      }

      // Migrate position_assignments (overseer)
      const overseerCount = await prisma.position_assignments.updateMany({
        where: { overseerId: duplicate.id },
        data: { overseerId: group.canonical.id }
      })
      if (overseerCount.count > 0) {
        console.log(`   ✓ Migrated ${overseerCount.count} overseer references`)
      }

      // Delete duplicate record
      await prisma.volunteers.delete({
        where: { id: duplicate.id }
      })
      console.log(`   ✓ Deleted duplicate record ${duplicate.id}`)
    }
  }

  console.log(`\n✅ Migration complete!`)
  console.log(`   Merged ${groups.length} duplicate groups`)
  console.log(`   Deleted ${groups.reduce((sum, g) => sum + g.duplicates.length, 0)} duplicate records`)
}

async function main() {
  console.log('🚀 Starting duplicate volunteer merge...\n')

  try {
    const duplicates = await findDuplicatesByEmail()

    if (duplicates.size === 0) {
      console.log('✅ No duplicate volunteers found!')
      return
    }

    await mergeDuplicates(duplicates)

  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
