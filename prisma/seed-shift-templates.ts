import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedShiftTemplates() {
  console.log('🌱 Seeding shift templates...')

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
      description: 'Standard CA shift pattern from your screenshot',
      shifts: [
        { name: '9:50 to 10', startTime: '09:50', endTime: '10:00' },
        { name: '10 to 12', startTime: '10:00', endTime: '12:00' },
        { name: '12 to 2', startTime: '12:00', endTime: '14:00' },
        { name: '2 to 5', startTime: '14:00', endTime: '17:00' }
      ],
      isSystemTemplate: true
    },
    {
      name: 'Morning/Afternoon',
      description: 'Simple two-shift pattern',
      shifts: [
        { name: 'Morning', startTime: '09:00', endTime: '13:00' },
        { name: 'Afternoon', startTime: '13:00', endTime: '17:00' }
      ],
      isSystemTemplate: true
    },
    {
      name: 'Three Hour Blocks',
      description: 'Standard 3-hour shifts',
      shifts: [
        { name: '9 to 12', startTime: '09:00', endTime: '12:00' },
        { name: '12 to 3', startTime: '12:00', endTime: '15:00' },
        { name: '3 to 6', startTime: '15:00', endTime: '18:00' }
      ],
      isSystemTemplate: true
    },
    {
      name: 'Regional Convention',
      description: 'Extended shifts for regional conventions',
      shifts: [
        { name: '8:30 to 10', startTime: '08:30', endTime: '10:00' },
        { name: '10 to 12', startTime: '10:00', endTime: '12:00' },
        { name: '12 to 2', startTime: '12:00', endTime: '14:00' },
        { name: '2 to 4', startTime: '14:00', endTime: '16:00' },
        { name: '4 to 6', startTime: '16:00', endTime: '18:00' }
      ],
      isSystemTemplate: true
    }
  ]

  for (const template of templates) {
    const existing = await prisma.shift_templates.findFirst({
      where: { name: template.name, isSystemTemplate: true }
    })

    if (!existing) {
      await prisma.shift_templates.create({
        data: {
          name: template.name,
          description: template.description,
          shifts: template.shifts,
          isSystemTemplate: template.isSystemTemplate
        }
      })
      console.log(`✅ Created template: ${template.name}`)
    } else {
      console.log(`⏭️  Template already exists: ${template.name}`)
    }
  }

  console.log('🌱 Shift templates seeding completed!')
}

seedShiftTemplates()
  .catch((e) => {
    console.error('❌ Error seeding shift templates:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
