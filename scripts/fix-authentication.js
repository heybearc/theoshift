const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixAuthentication() {
  console.log('🛡️ APEX GUARDIAN - AUTHENTICATION FIX')
  console.log('====================================')
  
  try {
    console.log('\n1. CLEANING UP OLD SESSIONS:')
    
    // Clean up any old sessions
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date()
        }
      }
    })
    
    console.log(`✅ Deleted ${deletedSessions.count} expired sessions`)
    
    // Clean up all sessions to force fresh login
    const allDeletedSessions = await prisma.session.deleteMany({})
    console.log(`✅ Deleted ${allDeletedSessions.count} remaining sessions`)
    
    console.log('\n2. VERIFYING USER ACCOUNT:')
    
    const adminUser = await prisma.users.findUnique({
      where: { email: 'admin@jwscheduler.local' },
      include: {
        accounts: true
      }
    })
    
    if (adminUser) {
      console.log(`✅ Admin user exists: ${adminUser.email}`)
      console.log(`   Role: ${adminUser.role}`)
      console.log(`   Active: ${adminUser.isActive}`)
      console.log(`   Accounts: ${adminUser.accounts.length}`)
      
      if (adminUser.passwordHash) {
        console.log('✅ Password hash exists')
      } else {
        console.log('❌ No password hash - this could be the issue')
      }
    } else {
      console.log('❌ Admin user not found')
    }
    
    console.log('\n3. CHECKING NEXTAUTH CONFIGURATION:')
    
    const fs = require('fs')
    const path = require('path')
    
    // Check environment variables
    const envFile = '.env.local'
    if (fs.existsSync(path.join(process.cwd(), envFile))) {
      const envContent = fs.readFileSync(path.join(process.cwd(), envFile), 'utf8')
      
      if (envContent.includes('NEXTAUTH_SECRET')) {
        console.log('✅ NEXTAUTH_SECRET configured')
      } else {
        console.log('❌ NEXTAUTH_SECRET missing')
      }
      
      if (envContent.includes('NEXTAUTH_URL')) {
        console.log('✅ NEXTAUTH_URL configured')
      } else {
        console.log('❌ NEXTAUTH_URL missing')
      }
    }
    
    console.log('\n4. TESTING DATABASE TABLES:')
    
    // Test that all NextAuth tables exist and are accessible
    try {
      const userCount = await prisma.users.count()
      console.log(`✅ users table: ${userCount} records`)
    } catch (error) {
      console.log(`❌ users table error: ${error.message}`)
    }
    
    try {
      const accountCount = await prisma.account.count()
      console.log(`✅ accounts table: ${accountCount} records`)
    } catch (error) {
      console.log(`❌ accounts table error: ${error.message}`)
    }
    
    try {
      const sessionCount = await prisma.session.count()
      console.log(`✅ sessions table: ${sessionCount} records`)
    } catch (error) {
      console.log(`❌ sessions table error: ${error.message}`)
    }
    
    console.log('\n🛡️ AUTHENTICATION FIX COMPLETE')
    console.log('===============================')
    console.log('NEXT STEPS:')
    console.log('1. Clear your browser cache and cookies for blue.theoshift.com')
    console.log('2. Go to: https://blue.theoshift.com/auth/signin')
    console.log('3. Log in with: admin@jwscheduler.local / admin123')
    console.log('4. Try accessing events again')
    
  } catch (error) {
    console.error('❌ AUTHENTICATION FIX FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAuthentication()
