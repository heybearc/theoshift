const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetAdminPassword() {
  const email = process.argv[2] || 'admin@jwscheduler.local'
  const newPassword = process.argv[3] || 'AdminPass123!'

  try {
    console.log(`🔐 Resetting password for: ${email}`)
    
    // Find user
    const user = await prisma.users.findUnique({
      where: { email }
    })

    if (!user) {
      console.error(`❌ User not found: ${email}`)
      console.log('\nAvailable users:')
      const users = await prisma.users.findMany({
        select: { email: true, role: true }
      })
      users.forEach(u => console.log(`  - ${u.email} (${u.role})`))
      process.exit(1)
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.users.update({
      where: { email },
      data: { passwordHash }
    })

    console.log('✅ Password reset successfully!')
    console.log('')
    console.log('Login Credentials:')
    console.log(`  Email: ${email}`)
    console.log(`  Password: ${newPassword}`)
    console.log('')
    console.log('🔐 Please change this password after logging in!')

  } catch (error) {
    console.error('❌ Error resetting password:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword()
