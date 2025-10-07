const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedShiftTemplates() {
  console.log('🛡️ APEX GUARDIAN - SEEDING SHIFT TEMPLATES')
  console.log('==========================================')
  
  try {
    // Check if templates already exist
    const existingTemplates = await prisma.shift_templates.findMany()
    
    if (existingTemplates.length > 0) {
      console.log(`✅ Found ${existingTemplates.length} existing templates:`)
      existingTemplates.forEach(template => {
        console.log(`   - ${template.name}: ${template.description}`)
      })
      return
    }
    
    // Create default shift templates
    const templates = [
      {
        name: 'All Day',
        description: 'Single all-day shift',
        shifts: [
          { name: 'All Day', isAllDay: true }
        ],
        isSystemTemplate: true
      },
      {
        name: 'Circuit Assembly Standard',
        description: 'Standard CA shift pattern',
        shifts: [
          { name: '9:50 to 10', startTime: '09:50', endTime: '10:00' },
          { name: '10 to 10:10', startTime: '10:00', endTime: '10:10' },
          { name: '10:10 to 10:20', startTime: '10:10', endTime: '10:20' },
          { name: '10:20 to 10:30', startTime: '10:20', endTime: '10:30' },
          { name: '10:30 to 10:40', startTime: '10:30', endTime: '10:40' },
          { name: '10:40 to 10:50', startTime: '10:40', endTime: '10:50' },
          { name: '10:50 to 11', startTime: '10:50', endTime: '11:00' },
          { name: '11 to 11:10', startTime: '11:00', endTime: '11:10' },
          { name: '11:10 to 11:20', startTime: '11:10', endTime: '11:20' },
          { name: '11:20 to 11:30', startTime: '11:20', endTime: '11:30' },
          { name: '11:30 to 11:40', startTime: '11:30', endTime: '11:40' },
          { name: '11:40 to 11:50', startTime: '11:40', endTime: '11:50' },
          { name: '11:50 to 12', startTime: '11:50', endTime: '12:00' }
        ],
        isSystemTemplate: true
      },
      {
        name: 'Regional Convention',
        description: 'Standard RC shift pattern',
        shifts: [
          { name: '9:20 to 9:30', startTime: '09:20', endTime: '09:30' },
          { name: '9:30 to 9:40', startTime: '09:30', endTime: '09:40' },
          { name: '9:40 to 9:50', startTime: '09:40', endTime: '09:50' },
          { name: '9:50 to 10', startTime: '09:50', endTime: '10:00' },
          { name: '10 to 10:10', startTime: '10:00', endTime: '10:10' },
          { name: '10:10 to 10:20', startTime: '10:10', endTime: '10:20' },
          { name: '10:20 to 10:30', startTime: '10:20', endTime: '10:30' },
          { name: '10:30 to 10:40', startTime: '10:30', endTime: '10:40' },
          { name: '10:40 to 10:50', startTime: '10:40', endTime: '10:50' },
          { name: '10:50 to 11', startTime: '10:50', endTime: '11:00' },
          { name: '11 to 11:10', startTime: '11:00', endTime: '11:10' },
          { name: '11:10 to 11:20', startTime: '11:10', endTime: '11:20' },
          { name: '11:20 to 11:30', startTime: '11:20', endTime: '11:30' },
          { name: '11:30 to 11:40', startTime: '11:30', endTime: '11:40' },
          { name: '11:40 to 11:50', startTime: '11:40', endTime: '11:50' },
          { name: '11:50 to 12', startTime: '11:50', endTime: '12:00' },
          { name: '1:30 to 1:40', startTime: '13:30', endTime: '13:40' },
          { name: '1:40 to 1:50', startTime: '13:40', endTime: '13:50' },
          { name: '1:50 to 2', startTime: '13:50', endTime: '14:00' },
          { name: '2 to 2:10', startTime: '14:00', endTime: '14:10' },
          { name: '2:10 to 2:20', startTime: '14:10', endTime: '14:20' },
          { name: '2:20 to 2:30', startTime: '14:20', endTime: '14:30' },
          { name: '2:30 to 2:40', startTime: '14:30', endTime: '14:40' },
          { name: '2:40 to 2:50', startTime: '14:40', endTime: '14:50' },
          { name: '2:50 to 3', startTime: '14:50', endTime: '15:00' },
          { name: '3 to 3:10', startTime: '15:00', endTime: '15:10' },
          { name: '3:10 to 3:20', startTime: '15:10', endTime: '15:20' },
          { name: '3:20 to 3:30', startTime: '15:20', endTime: '15:30' },
          { name: '3:30 to 3:40', startTime: '15:30', endTime: '15:40' },
          { name: '3:40 to 3:50', startTime: '15:40', endTime: '15:50' },
          { name: '3:50 to 4', startTime: '15:50', endTime: '16:00' }
        ],
        isSystemTemplate: true
      },
      {
        name: 'Morning/Afternoon',
        description: 'Two shift pattern - morning and afternoon',
        shifts: [
          { name: 'Morning', startTime: '09:00', endTime: '12:00' },
          { name: 'Afternoon', startTime: '13:00', endTime: '16:00' }
        ],
        isSystemTemplate: true
      }
    ]
    
    console.log('\n📝 Creating shift templates...')
    
    for (const template of templates) {
      const created = await prisma.shift_templates.create({
        data: template
      })
      console.log(`✅ Created: ${created.name} (${created.shifts.length} shifts)`)
    }
    
    console.log('\n🛡️ SHIFT TEMPLATES SEEDED SUCCESSFULLY')
    console.log('=====================================')
    console.log(`✅ Created ${templates.length} system templates`)
    console.log('✅ Bulk position creation now available')
    
  } catch (error) {
    console.error('❌ SEEDING FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedShiftTemplates()
