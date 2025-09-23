#!/usr/bin/env node

// WMACS Guardian: Emergency Auth Fix
// Fixes the infinite redirect loop by correcting NextAuth configuration

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSEmergencyAuthFix {
  constructor() {
    this.productionServer = '10.92.3.22';
    this.productionPath = '/opt/jw-attendant-nextjs';
  }

  async runEmergencyFix() {
    console.log('🚨 WMACS GUARDIAN: EMERGENCY AUTH FIX ACTIVATED!');
    console.log('==============================================\n');
    
    // Step 1: Stop service
    await this.stopService();
    
    // Step 2: Fix auth configuration
    await this.fixAuthConfiguration();
    
    // Step 3: Remove custom signin page
    await this.removeCustomSigninPage();
    
    // Step 4: Clean rebuild
    await this.cleanRebuild();
    
    // Step 5: Start and test
    await this.startAndTest();
    
    console.log('\n🎉 WMACS GUARDIAN: EMERGENCY FIX COMPLETE!');
  }

  async stopService() {
    console.log('🛑 Stopping service...');
    try {
      await execAsync(`ssh root@${this.productionServer} "systemctl stop jw-attendant-nextjs"`);
      console.log('   ✅ Service stopped');
    } catch (error) {
      console.log('   ⚠️  Service stop failed:', error.message);
    }
  }

  async fixAuthConfiguration() {
    console.log('\n🔧 Fixing auth configuration...');
    
    const authConfig = `import { AuthOptions, getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from '@prisma/client'

// WMACS Guardian: Proper Prisma singleton pattern
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const authOptions: AuthOptions = {
  // WMACS Guardian Emergency Fix: Use default NextAuth pages only
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      id: "credentials",
      credentials: {
        email: { 
          label: "Email", 
          type: "email", 
          placeholder: "admin@jwscheduler.local" 
        },
        password: { 
          label: "Password", 
          type: "password" 
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter an email and password")
        }

        try {
          const user = await prisma.users.findUnique({
            where: {
              email: credentials.email
            }
          });

          if (!user) {
            throw new Error("No user found with this email")
          }

          if (!user.passwordHash) {
            throw new Error("User has no password set")
          }

          const bcrypt = require('bcryptjs');
          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

          if (!isPasswordValid) {
            throw new Error("Invalid password")
          }

          await prisma.users.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          });

          return {
            id: user.id,
            email: user.email,
            name: \`\${user.firstName} \${user.lastName}\`,
            role: user.role
          }
        } catch (error) {
          console.error('Auth error:', error)
          throw new Error("Authentication failed")
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false
}

export const getSession = () => getServerSession(authOptions)`;

    try {
      // Write the fixed auth configuration
      await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && cat > auth.ts << 'AUTHEOF'
${authConfig}
AUTHEOF"`);
      
      console.log('   ✅ Auth configuration fixed');
    } catch (error) {
      console.log('   ❌ Auth config fix failed:', error.message);
    }
  }

  async removeCustomSigninPage() {
    console.log('\n🗑️  Removing custom signin page...');
    
    try {
      // Remove custom auth pages that might be causing conflicts
      await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && rm -rf src/app/auth"`);
      console.log('   ✅ Custom auth pages removed');
    } catch (error) {
      console.log('   ⚠️  Custom auth page removal failed:', error.message);
    }
  }

  async cleanRebuild() {
    console.log('\n🔨 Clean rebuild...');
    
    try {
      // Clean everything
      await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && rm -rf .next"`);
      console.log('   ✅ Build cache cleared');
      
      // Rebuild
      await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && npm run build"`);
      console.log('   ✅ Application rebuilt');
      
    } catch (error) {
      console.log('   ❌ Rebuild failed:', error.message);
    }
  }

  async startAndTest() {
    console.log('\n🚀 Starting service and testing...');
    
    try {
      // Start service
      await execAsync(`ssh root@${this.productionServer} "systemctl start jw-attendant-nextjs"`);
      console.log('   ✅ Service started');
      
      // Wait for startup
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test root redirect
      const rootTest = await execAsync(`curl -s http://10.92.3.22:3001/`);
      console.log('   📋 Root redirect:', rootTest.stdout.trim());
      
      // Test auth providers
      const providersTest = await execAsync(`curl -s http://10.92.3.22:3001/api/auth/providers`);
      if (providersTest.stdout.includes('credentials')) {
        console.log('   ✅ Auth providers working');
      } else {
        console.log('   ❌ Auth providers not working');
      }
      
    } catch (error) {
      console.log('   ❌ Start/test failed:', error.message);
    }
  }
}

// Run emergency fix
const emergencyFix = new WMACSEmergencyAuthFix();
emergencyFix.runEmergencyFix().catch(console.error);
