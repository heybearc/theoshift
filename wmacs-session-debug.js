#!/usr/bin/env node

// WMACS Guardian: Session Debug - Test actual authenticated API calls
// Simulate what the dashboard is doing when it tries to fetch data

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSSessionDebug {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.stagingServer = 'jws';
  }

  async runSessionDebug() {
    console.log('🔍 WMACS Guardian: Session Debug - Testing Authenticated API Calls...\n');
    
    // Test 1: Simulate browser authentication flow
    await this.simulateAuthenticatedSession();
    
    // Test 2: Test getServerSession directly
    await this.testGetServerSession();
    
    // Test 3: Check if API routes are working with sessions
    await this.testAPIWithSession();
    
    // Test 4: Debug the exact dashboard fetch issue
    await this.debugDashboardFetch();
  }

  async simulateAuthenticatedSession() {
    console.log('🔐 Simulating Authenticated Session');
    
    try {
      // Step 1: Get CSRF token
      const csrfResult = await execAsync(`ssh ${this.stagingServer} "curl -s -c /tmp/session_cookies.txt '${this.baseUrl}/api/auth/csrf'"`);
      const csrf = JSON.parse(csrfResult.stdout);
      console.log('   CSRF Token:', csrf.csrfToken ? 'Available' : 'Missing');
      
      // Step 2: Try to sign in (simulate form submission)
      const signinData = `csrfToken=${csrf.csrfToken}&email=admin@jwscheduler.local&password=admin123&callbackUrl=${this.baseUrl}/dashboard`;
      
      const signinResult = await execAsync(`ssh ${this.stagingServer} "curl -s -b /tmp/session_cookies.txt -c /tmp/session_cookies.txt -X POST -H 'Content-Type: application/x-www-form-urlencoded' -d '${signinData}' '${this.baseUrl}/api/auth/callback/credentials'"`);
      
      console.log('   Signin attempt response length:', signinResult.stdout.length);
      
      // Step 3: Check session after signin
      const sessionAfterResult = await execAsync(`ssh ${this.stagingServer} "curl -s -b /tmp/session_cookies.txt '${this.baseUrl}/api/auth/session'"`);
      console.log('   Session after signin:', sessionAfterResult.stdout.trim());
      
      // Step 4: Try API call with session cookies
      const apiResult = await execAsync(`ssh ${this.stagingServer} "curl -s -b /tmp/session_cookies.txt '${this.baseUrl}/api/users'"`);
      console.log('   API call with session:', apiResult.stdout.trim());
      
      // Cleanup
      await execAsync(`ssh ${this.stagingServer} "rm -f /tmp/session_cookies.txt"`);
      
    } catch (error) {
      console.log('   ❌ Authenticated session simulation failed:', error.message);
    }
  }

  async testGetServerSession() {
    console.log('\n🔧 Testing getServerSession Implementation');
    
    try {
      // Create a test API endpoint to debug getServerSession
      const testEndpoint = `
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    return NextResponse.json({
      success: true,
      hasSession: !!session,
      sessionData: session ? {
        user: session.user,
        expires: session.expires
      } : null,
      debug: {
        authOptionsExists: !!authOptions,
        requestHeaders: Object.fromEntries(req.headers.entries())
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}`;

      // Write test endpoint to server
      await execAsync(`ssh ${this.stagingServer} "mkdir -p /opt/theoshift/src/app/api/debug-session && cat > /opt/theoshift/src/app/api/debug-session/route.ts << 'EOF'
${testEndpoint}
EOF"`);

      // Restart app to load new endpoint
      await execAsync(`ssh ${this.stagingServer} "/opt/theoshift/wmacs-simple-start.sh"`);
      
      // Wait for restart
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test the debug endpoint
      const debugResult = await execAsync(`ssh ${this.stagingServer} "curl -s '${this.baseUrl}/api/debug-session'"`);
      console.log('   getServerSession debug:', debugResult.stdout.trim());
      
    } catch (error) {
      console.log('   ❌ getServerSession test failed:', error.message);
    }
  }

  async testAPIWithSession() {
    console.log('\n🔌 Testing API Routes with Session');
    
    try {
      // Check what headers the API routes are receiving
      const headersTest = await execAsync(`ssh ${this.stagingServer} "curl -s -H 'Cookie: test=value' -v '${this.baseUrl}/api/users' 2>&1 | grep -E 'Cookie|Authorization|Session'"`);
      console.log('   Headers being sent:', headersTest.stdout.trim());
      
      // Check if the auth-helpers getAuthenticatedSession is working
      const authHelpersCheck = await execAsync(`ssh ${this.stagingServer} "grep -A 5 'getAuthenticatedSession' /opt/theoshift/src/lib/auth-helpers.ts"`);
      console.log('   Auth helpers implementation:', authHelpersCheck.stdout.trim());
      
    } catch (error) {
      console.log('   ❌ API session test failed:', error.message);
    }
  }

  async debugDashboardFetch() {
    console.log('\n📊 Debugging Dashboard Fetch Issue');
    
    try {
      // Check what the dashboard is actually doing
      const dashboardCode = await execAsync(`ssh ${this.stagingServer} "grep -A 10 -B 5 'fetch.*api' /opt/theoshift/src/app/dashboard/page.tsx"`);
      console.log('   Dashboard fetch code:', dashboardCode.stdout.trim());
      
      // Check if the credentials: 'include' is actually in the deployed code
      const credentialsCheck = await execAsync(`ssh ${this.stagingServer} "grep -n 'credentials.*include' /opt/theoshift/src/app/dashboard/page.tsx"`);
      console.log('   Credentials include found:', credentialsCheck.stdout.trim());
      
    } catch (error) {
      console.log('   ❌ Dashboard debug failed:', error.message);
    }
  }
}

// Run session debug
const sessionDebugger = new WMACSSessionDebug();
sessionDebugger.runSessionDebug().catch(console.error);
