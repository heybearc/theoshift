const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function completeSystemAudit() {
  console.log('🛡️ APEX GUARDIAN - COMPLETE SYSTEM AUDIT')
  console.log('========================================')
  
  try {
    console.log('\n1. ENVIRONMENT VERIFICATION:')
    console.log('Current working directory:', process.cwd())
    console.log('Node version:', process.version)
    console.log('Environment:', process.env.NODE_ENV)
    
    // Check all environment files
    const envFiles = ['.env', '.env.local', '.env.staging']
    envFiles.forEach(file => {
      if (fs.existsSync(path.join(process.cwd(), file))) {
        console.log(`✅ ${file} exists`)
        const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
        console.log(`   DATABASE_URL: ${content.includes('DATABASE_URL') ? 'SET' : 'MISSING'}`)
        console.log(`   NEXTAUTH_SECRET: ${content.includes('NEXTAUTH_SECRET') ? 'SET' : 'MISSING'}`)
        console.log(`   NEXTAUTH_URL: ${content.includes('NEXTAUTH_URL') ? 'SET' : 'MISSING'}`)
      } else {
        console.log(`❌ ${file} missing`)
      }
    })
    
    console.log('\n2. DATABASE CONNECTION TEST:')
    try {
      await prisma.$connect()
      console.log('✅ Database connection successful')
      
      // Test basic query
      const result = await prisma.$queryRaw`SELECT 1 as test`
      console.log('✅ Database query successful:', result)
      
      // Check database name
      const dbInfo = await prisma.$queryRaw`SELECT current_database() as db_name`
      console.log('✅ Connected to database:', dbInfo[0].db_name)
      
    } catch (error) {
      console.log('❌ Database connection failed:', error.message)
    }
    
    console.log('\n3. PRISMA CLIENT VERIFICATION:')
    try {
      // Check if Prisma client is generated
      const prismaClientPath = 'node_modules/@prisma/client'
      if (fs.existsSync(path.join(process.cwd(), prismaClientPath))) {
        console.log('✅ Prisma client exists')
        
        // Check if models are available
        console.log('Available models:', Object.keys(prisma).filter(key => !key.startsWith('$')))
        
        // Test each critical model
        const models = ['events', 'users', 'positions', 'shift_templates']
        for (const model of models) {
          try {
            const count = await prisma[model].count()
            console.log(`✅ ${model} table: ${count} records`)
          } catch (error) {
            console.log(`❌ ${model} table error: ${error.message}`)
          }
        }
      } else {
        console.log('❌ Prisma client not found')
      }
    } catch (error) {
      console.log('❌ Prisma client error:', error.message)
    }
    
    console.log('\n4. API FILES VERIFICATION:')
    const criticalApiFiles = [
      'pages/api/auth/[...nextauth].ts',
      'pages/api/events.ts',
      'pages/api/events/[id].ts',
      'pages/api/events/[id]/positions/index.ts',
      'pages/api/shift-templates.ts'
    ]
    
    criticalApiFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file)
      if (fs.existsSync(fullPath)) {
        console.log(`✅ ${file} exists`)
        const content = fs.readFileSync(fullPath, 'utf8')
        
        // Check for critical components
        const checks = [
          { name: 'getServerSession', present: content.includes('getServerSession') },
          { name: 'prisma import', present: content.includes('prisma') },
          { name: 'export default', present: content.includes('export default') },
          { name: 'NextApiRequest', present: content.includes('NextApiRequest') }
        ]
        
        checks.forEach(check => {
          console.log(`   ${check.present ? '✅' : '❌'} ${check.name}`)
        })
      } else {
        console.log(`❌ ${file} missing`)
      }
    })
    
    console.log('\n5. BUILD VERIFICATION:')
    const buildPath = '.next'
    if (fs.existsSync(path.join(process.cwd(), buildPath))) {
      console.log('✅ Build directory exists')
      
      // Check build manifest
      const manifestPath = path.join(process.cwd(), buildPath, 'build-manifest.json')
      if (fs.existsSync(manifestPath)) {
        console.log('✅ Build manifest exists')
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
        
        // Check if our API routes are in the build
        const apiRoutes = Object.keys(manifest.pages).filter(page => page.startsWith('/api/'))
        console.log(`✅ API routes in build: ${apiRoutes.length}`)
        
        const criticalRoutes = ['/api/events', '/api/events/[id]']
        criticalRoutes.forEach(route => {
          if (apiRoutes.includes(route)) {
            console.log(`   ✅ ${route} built`)
          } else {
            console.log(`   ❌ ${route} missing from build`)
          }
        })
      } else {
        console.log('❌ Build manifest missing')
      }
    } else {
      console.log('❌ Build directory missing')
    }
    
    console.log('\n6. ACTUAL EVENT DATA TEST:')
    try {
      const events = await prisma.events.findMany({
        take: 2,
        include: {
          positions: true,
          event_attendant_associations: true,
          assignments: true,
          event_positions: true
        }
      })
      
      console.log(`✅ Found ${events.length} events`)
      events.forEach((event, index) => {
        console.log(`Event ${index + 1}:`)
        console.log(`   ID: ${event.id}`)
        console.log(`   Name: ${event.name}`)
        console.log(`   Status: ${event.status}`)
        console.log(`   Positions: ${event.positions.length}`)
        console.log(`   Legacy positions: ${event.event_positions.length}`)
      })
      
      // Test the exact transformation the API does
      if (events.length > 0) {
        const testEvent = events[0]
        const transformed = {
          ...testEvent,
          event_positions: testEvent.positions.map(position => ({
            id: position.id,
            positionNumber: position.positionNumber,
            title: position.name,
            department: position.area || "General",
            description: position.description,
            _count: {
              assignments: position.assignments?.length || 0
            }
          })),
          _count: {
            event_attendant_associations: testEvent.event_attendant_associations.length,
            assignments: testEvent.assignments.length,
            event_positions: testEvent.positions.length
          }
        }
        
        console.log('✅ API transformation test successful')
        console.log(`   Transformed event_positions: ${transformed.event_positions.length}`)
        console.log(`   _count: ${JSON.stringify(transformed._count)}`)
      }
      
    } catch (error) {
      console.log('❌ Event data test failed:', error.message)
    }
    
    console.log('\n7. AUTHENTICATION SYSTEM TEST:')
    try {
      const users = await prisma.users.findMany({
        include: {
          accounts: true
        }
      })
      
      console.log(`✅ Found ${users.length} users`)
      users.forEach(user => {
        console.log(`   User: ${user.email} (${user.role})`)
        console.log(`   Active: ${user.isActive}`)
        console.log(`   Password hash: ${user.passwordHash ? 'EXISTS' : 'MISSING'}`)
        console.log(`   Accounts: ${user.accounts.length}`)
      })
      
      // Test sessions
      const sessions = await prisma.session.findMany()
      console.log(`✅ Active sessions: ${sessions.length}`)
      
    } catch (error) {
      console.log('❌ Authentication test failed:', error.message)
    }
    
    console.log('\n8. NETWORK/SERVER TEST:')
    try {
      const http = require('http')
      
      // Test if server is responding on localhost
      const testLocalhost = () => {
        return new Promise((resolve, reject) => {
          const req = http.get('http://localhost:3001/api/events', (res) => {
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => {
              resolve({ status: res.statusCode, data })
            })
          })
          req.on('error', reject)
          req.setTimeout(5000, () => reject(new Error('Timeout')))
        })
      }
      
      try {
        const result = await testLocalhost()
        console.log(`✅ Localhost API test: ${result.status}`)
        console.log(`   Response: ${result.data.substring(0, 100)}...`)
      } catch (error) {
        console.log(`❌ Localhost API test failed: ${error.message}`)
      }
      
    } catch (error) {
      console.log('❌ Network test failed:', error.message)
    }
    
    console.log('\n🛡️ COMPLETE SYSTEM AUDIT FINISHED')
    console.log('==================================')
    
  } catch (error) {
    console.error('❌ SYSTEM AUDIT FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

completeSystemAudit()
