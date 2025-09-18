const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // Create sample attendants
  const attendant1 = await prisma.attendant.create({
    data: {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      phone: '555-0101',
      isActive: true,
    },
  })

  const attendant2 = await prisma.attendant.create({
    data: {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      phone: '555-0102',
      isActive: true,
    },
  })

  // Create sample events
  const event1 = await prisma.event.create({
    data: {
      name: 'Midweek Meeting',
      description: 'Weekly congregation meeting',
      eventDate: new Date('2024-01-15T19:00:00Z'),
      location: 'Kingdom Hall',
      isActive: true,
    },
  })

  const event2 = await prisma.event.create({
    data: {
      name: 'Weekend Meeting',
      description: 'Weekend public meeting',
      eventDate: new Date('2024-01-20T10:00:00Z'),
      location: 'Kingdom Hall',
      isActive: true,
    },
  })

  // Create sample assignments
  await prisma.assignment.create({
    data: {
      attendantId: attendant1.id,
      eventId: event1.id,
      role: 'Sound Operator',
      notes: 'Check microphone levels',
    },
  })

  await prisma.assignment.create({
    data: {
      attendantId: attendant2.id,
      eventId: event2.id,
      role: 'Platform Assistant',
      notes: 'Prepare platform materials',
    },
  })

  // Create sample count sessions
  await prisma.countSession.create({
    data: {
      sessionName: 'Midweek Meeting Count - Jan 15',
      eventId: event1.id,
      countTime: new Date('2024-01-15T19:30:00Z'),
      notes: 'Peak attendance: 45',
      isActive: true,
    },
  })

  await prisma.countSession.create({
    data: {
      sessionName: 'Weekend Meeting Count - Jan 20',
      eventId: event2.id,
      countTime: new Date('2024-01-20T10:30:00Z'),
      notes: 'Peak attendance: 62',
      isActive: true,
    },
  })

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
