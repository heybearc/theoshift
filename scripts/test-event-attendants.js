#!/usr/bin/env node

// APEX GUARDIAN Event-Specific Attendants Testing Script
// Comprehensive validation of the refactored architecture

const { PrismaClient } = require('@prisma/client')

async function testEventAttendantsArchitecture() {
  const prisma = new PrismaClient()
  
  console.log('🛡️ APEX GUARDIAN - Event-Specific Attendants Testing')
  console.log('=' .repeat(60))
  
  try {
    // Test 1: Verify database schema
    console.log('\n📋 TEST 1: Database Schema Validation')
    
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'event_attendants'
      );
    `
    
    if (tableExists[0].exists) {
      console.log('✅ event_attendants table exists')
      
      // Check table structure
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'event_attendants'
        ORDER BY ordinal_position;
      `
      
      console.log(`✅ Table has ${columns.length} columns`)
      
      // Verify key columns exist
      const requiredColumns = ['id', 'event_id', 'first_name', 'last_name', 'email', 'congregation']
      const existingColumns = columns.map(c => c.column_name)
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
      
      if (missingColumns.length === 0) {
        console.log('✅ All required columns present')
      } else {
        console.log('❌ Missing columns:', missingColumns)
      }
    } else {
      console.log('❌ event_attendants table does not exist')
    }
    
    // Test 2: Verify events exist
    console.log('\n📋 TEST 2: Events Validation')
    
    const events = await prisma.events.findMany({
      select: { id: true, name: true }
    })
    
    console.log(`✅ Found ${events.length} events`)
    events.forEach(event => {
      console.log(`   - ${event.name} (${event.id})`)
    })
    
    // Test 3: Check existing data migration
    console.log('\n📋 TEST 3: Data Migration Status')
    
    const globalAttendants = await prisma.attendants.count()
    console.log(`📊 Global attendants: ${globalAttendants}`)
    
    if (await tableExists[0].exists) {
      const eventAttendants = await prisma.event_attendants.count()
      console.log(`📊 Event-specific attendants: ${eventAttendants}`)
      
      if (eventAttendants > 0) {
        // Check distribution across events
        const distribution = await prisma.event_attendants.groupBy({
          by: ['eventId'],
          _count: { eventId: true }
        })
        
        console.log('📊 Attendants per event:')
        for (const dist of distribution) {
          const event = events.find(e => e.id === dist.eventId)
          console.log(`   - ${event?.name || 'Unknown'}: ${dist._count.eventId}`)
        }
      }
    }
    
    // Test 4: API Endpoint Testing (if running)
    console.log('\n📋 TEST 4: API Endpoint Testing')
    
    if (events.length > 0) {
      const testEventId = events[0].id
      
      try {
        const response = await fetch(`http://localhost:3001/api/events/${testEventId}/attendants?page=1&limit=5`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ Event attendants API endpoint working')
          console.log(`📊 Returned ${data.data?.attendants?.length || 0} attendants`)
          console.log(`📊 Total: ${data.data?.pagination?.total || 0}`)
        } else {
          console.log(`❌ API endpoint returned ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        console.log('⚠️  API endpoint test skipped (server not running)')
      }
    }
    
    // Test 5: Data Integrity Checks
    console.log('\n📋 TEST 5: Data Integrity Validation')
    
    if (await tableExists[0].exists) {
      // Check for orphaned records
      const orphanedAttendants = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM event_attendants ea
        LEFT JOIN events e ON ea.event_id = e.id
        WHERE e.id IS NULL;
      `
      
      if (orphanedAttendants[0].count === 0) {
        console.log('✅ No orphaned attendant records')
      } else {
        console.log(`❌ Found ${orphanedAttendants[0].count} orphaned attendant records`)
      }
      
      // Check for duplicate emails within events
      const duplicates = await prisma.$queryRaw`
        SELECT event_id, email, COUNT(*) as count
        FROM event_attendants
        GROUP BY event_id, email
        HAVING COUNT(*) > 1;
      `
      
      if (duplicates.length === 0) {
        console.log('✅ No duplicate emails within events')
      } else {
        console.log(`❌ Found ${duplicates.length} duplicate email entries`)
      }
    }
    
    console.log('\n🛡️ APEX GUARDIAN Testing Complete')
    console.log('=' .repeat(60))
    
  } catch (error) {
    console.error('❌ Testing failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the tests
testEventAttendantsArchitecture().catch(console.error)
