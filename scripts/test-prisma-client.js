const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testPrismaClient() {
  console.log('🔍 Testing Prisma Client Table Access...')
  
  try {
    // Test 1: Check if positions table is accessible
    console.log('\n1. Testing positions table access:')
    const positionsCount = await prisma.positions.count()
    console.log(`✅ positions table accessible - count: ${positionsCount}`)
    
    // Test 2: Check if shift_templates table is accessible  
    console.log('\n2. Testing shift_templates table access:')
    const templatesCount = await prisma.shift_templates.count()
    console.log(`✅ shift_templates table accessible - count: ${templatesCount}`)
    
    // Test 3: Check if position_shifts table is accessible
    console.log('\n3. Testing position_shifts table access:')
    const shiftsCount = await prisma.position_shifts.count()
    console.log(`✅ position_shifts table accessible - count: ${shiftsCount}`)
    
    // Test 4: Check events table
    console.log('\n4. Testing events table access:')
    const eventsCount = await prisma.events.count()
    console.log(`✅ events table accessible - count: ${eventsCount}`)
    
    console.log('\n🎉 All Prisma client table access tests passed!')
    
  } catch (error) {
    console.error('❌ Prisma client error:', error.message)
    console.error('Full error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPrismaClient()
