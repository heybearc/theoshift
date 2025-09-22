#!/usr/bin/env node

// WMACS Guardian: Comprehensive Route Check
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSRouteChecker {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.routes = [
      '/',
      '/auth/signin',
      '/api/auth/providers',
      '/api/auth/csrf',
      '/dashboard',
      '/users',
      '/attendants'
    ];
  }

  async checkAllRoutes() {
    console.log('🔍 WMACS Guardian: Checking all routes...');
    
    for (const route of this.routes) {
      await this.checkRoute(route);
    }
    
    console.log('\n📊 WMACS Route Check Complete');
  }

  async checkRoute(route) {
    try {
      const cmd = `ssh jws "curl -s -w 'HTTP:%{http_code}' '${this.baseUrl}${route}' | tail -1"`;
      const result = await execAsync(cmd);
      const httpCode = result.stdout.trim();
      
      console.log(`   ${route.padEnd(20)} ${httpCode}`);
      
      // Additional checks for specific routes
      if (route === '/auth/signin') {
        await this.checkSigninPage();
      }
      
    } catch (error) {
      console.log(`   ${route.padEnd(20)} ERROR: ${error.message}`);
    }
  }

  async checkSigninPage() {
    try {
      const cmd = `ssh jws "curl -s '${this.baseUrl}/auth/signin' | grep -o 'Sign in' | head -1"`;
      const result = await execAsync(cmd);
      
      if (result.stdout.trim() === 'Sign in') {
        console.log(`     ✅ Signin page loads correctly`);
      } else {
        console.log(`     ❌ Signin page content missing`);
      }
    } catch (error) {
      console.log(`     ❌ Signin page check failed`);
    }
  }
}

const checker = new WMACSRouteChecker();
checker.checkAllRoutes().catch(console.error);
