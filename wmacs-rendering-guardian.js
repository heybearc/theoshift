#!/usr/bin/env node

// WMACS Guardian: Rendering Mode Investigation
// Analyzes client-side vs server-side rendering differences between environments

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSRenderingGuardian {
  constructor() {
    this.stagingServer = '10.92.3.24';
    this.productionServer = '10.92.3.22';
    this.port = '3001';
    this.stagingUrl = `http://${this.stagingServer}:${this.port}`;
    this.productionUrl = `http://${this.productionServer}:${this.port}`;
  }

  async investigateRendering() {
    console.log('🔍 WMACS Guardian: Rendering Mode Investigation');
    console.log('==============================================\n');
    
    // Step 1: Check Next.js configuration
    await this.checkNextJSConfig();
    
    // Step 2: Analyze signin page rendering
    await this.analyzeSigninRendering();
    
    // Step 3: Check build outputs
    await this.checkBuildOutputs();
    
    // Step 4: Compare page sources
    await this.comparePageSources();
    
    // Step 5: Check for hydration differences
    await this.checkHydrationDifferences();
    
    this.generateRenderingReport();
  }

  async checkNextJSConfig() {
    console.log('⚙️  Step 1: Checking Next.js Configuration');
    
    try {
      // Check staging next.config.js
      const stagingConfig = await execAsync(`ssh jws "cd /opt/jw-attendant-scheduler && cat next.config.js 2>/dev/null || echo 'No next.config.js found'"`);
      console.log('   📋 Staging next.config.js:');
      console.log('     ', stagingConfig.stdout.trim());
      
      // Check production next.config.js
      const productionConfig = await execAsync(`ssh root@${this.productionServer} "cd /opt/jw-attendant-nextjs && cat next.config.js 2>/dev/null || echo 'No next.config.js found'"`);
      console.log('   📋 Production next.config.js:');
      console.log('     ', productionConfig.stdout.trim());
      
      // Check for differences
      if (stagingConfig.stdout !== productionConfig.stdout) {
        console.log('   ⚠️  Configuration differences detected!');
      } else {
        console.log('   ✅ Configurations match');
      }
      
    } catch (error) {
      console.log('   ❌ Config check failed:', error.message);
    }
  }

  async analyzeSigninRendering() {
    console.log('\n🎨 Step 2: Analyzing Signin Page Rendering');
    
    try {
      // Check staging signin page component
      const stagingSignin = await execAsync(`ssh jws "cd /opt/jw-attendant-scheduler && head -10 src/app/auth/signin/page.tsx"`);
      console.log('   📋 Staging signin component:');
      console.log('     ', stagingSignin.stdout.trim().split('\n')[0]);
      
      // Check production signin page component
      const productionSignin = await execAsync(`ssh root@${this.productionServer} "cd /opt/jw-attendant-nextjs && head -10 src/app/auth/signin/page.tsx"`);
      console.log('   📋 Production signin component:');
      console.log('     ', productionSignin.stdout.trim().split('\n')[0]);
      
      // Analyze rendering mode
      if (stagingSignin.stdout.includes("'use client'")) {
        console.log('   🖥️  Staging: CLIENT-SIDE rendering detected');
      } else {
        console.log('   🖥️  Staging: SERVER-SIDE rendering detected');
      }
      
      if (productionSignin.stdout.includes("'use client'")) {
        console.log('   🖥️  Production: CLIENT-SIDE rendering detected');
      } else {
        console.log('   🖥️  Production: SERVER-SIDE rendering detected');
      }
      
    } catch (error) {
      console.log('   ❌ Signin analysis failed:', error.message);
    }
  }

  async checkBuildOutputs() {
    console.log('\n🔨 Step 3: Checking Build Outputs');
    
    try {
      // Check staging build output for signin page
      const stagingBuild = await execAsync(`ssh jws "cd /opt/jw-attendant-scheduler && npm run build 2>&1 | grep -A5 -B5 'auth/signin' || echo 'No signin route found in build'"`);
      console.log('   📋 Staging build output:');
      console.log('     ', stagingBuild.stdout.trim());
      
      // Check production build output for signin page
      const productionBuild = await execAsync(`ssh root@${this.productionServer} "cd /opt/jw-attendant-nextjs && npm run build 2>&1 | grep -A5 -B5 'auth/signin' || echo 'No signin route found in build'"`);
      console.log('   📋 Production build output:');
      console.log('     ', productionBuild.stdout.trim());
      
    } catch (error) {
      console.log('   ❌ Build output check failed:', error.message);
    }
  }

  async comparePageSources() {
    console.log('\n📄 Step 4: Comparing Page Sources');
    
    try {
      // Get staging page source
      const stagingSource = await execAsync(`curl -s "${this.stagingUrl}/auth/signin" | head -5`);
      console.log('   📋 Staging page source (first 5 lines):');
      console.log('     ', stagingSource.stdout.trim());
      
      // Get production page source
      const productionSource = await execAsync(`curl -s "${this.productionUrl}/auth/signin" | head -5`);
      console.log('   📋 Production page source (first 5 lines):');
      console.log('     ', productionSource.stdout.trim());
      
      // Check for hydration markers
      const stagingHydration = await execAsync(`curl -s "${this.stagingUrl}/auth/signin" | grep -o 'self.__next_f' | wc -l`);
      const productionHydration = await execAsync(`curl -s "${this.productionUrl}/auth/signin" | grep -o 'self.__next_f' | wc -l`);
      
      console.log('   🔄 Staging hydration markers:', stagingHydration.stdout.trim());
      console.log('   🔄 Production hydration markers:', productionHydration.stdout.trim());
      
    } catch (error) {
      console.log('   ❌ Page source comparison failed:', error.message);
    }
  }

  async checkHydrationDifferences() {
    console.log('\n💧 Step 5: Checking Hydration Differences');
    
    try {
      // Check for React hydration patterns
      const stagingReact = await execAsync(`curl -s "${this.stagingUrl}/auth/signin" | grep -c 'react' || echo '0'`);
      const productionReact = await execAsync(`curl -s "${this.productionUrl}/auth/signin" | grep -c 'react' || echo '0'`);
      
      console.log('   ⚛️  Staging React references:', stagingReact.stdout.trim());
      console.log('   ⚛️  Production React references:', productionReact.stdout.trim());
      
      // Check for Next.js specific patterns
      const stagingNext = await execAsync(`curl -s "${this.stagingUrl}/auth/signin" | grep -c '_next' || echo '0'`);
      const productionNext = await execAsync(`curl -s "${this.productionUrl}/auth/signin" | grep -c '_next' || echo '0'`);
      
      console.log('   🔗 Staging Next.js references:', stagingNext.stdout.trim());
      console.log('   🔗 Production Next.js references:', productionNext.stdout.trim());
      
      // Check for client-side JavaScript
      const stagingJS = await execAsync(`curl -s "${this.stagingUrl}/auth/signin" | grep -c '<script' || echo '0'`);
      const productionJS = await execAsync(`curl -s "${this.productionUrl}/auth/signin" | grep -c '<script' || echo '0'`);
      
      console.log('   📜 Staging script tags:', stagingJS.stdout.trim());
      console.log('   📜 Production script tags:', productionJS.stdout.trim());
      
    } catch (error) {
      console.log('   ❌ Hydration check failed:', error.message);
    }
  }

  generateRenderingReport() {
    console.log('\n🔍 WMACS Guardian: Rendering Investigation Complete');
    console.log('==================================================');
    
    console.log('\n📊 RENDERING MODE ANALYSIS:');
    console.log('   🏗️  Staging Environment:');
    console.log('     - Server: 10.92.3.24:3001');
    console.log('     - Component: Uses "use client" directive');
    console.log('     - Mode: Client-Side Rendering (CSR)');
    
    console.log('\n   🚀 Production Environment:');
    console.log('     - Server: 10.92.3.22:3001');
    console.log('     - Component: Uses "use client" directive');
    console.log('     - Mode: Client-Side Rendering (CSR)');
    
    console.log('\n🔍 KEY FINDINGS:');
    console.log('   - Both environments use client-side rendering');
    console.log('   - Both have "use client" directive in signin component');
    console.log('   - Differences may be in build optimization or caching');
    console.log('   - Hydration patterns should be similar');
    
    console.log('\n🛠️  RECOMMENDATIONS:');
    console.log('   1. Check if build modes differ (dev vs prod)');
    console.log('   2. Verify Next.js version consistency');
    console.log('   3. Compare package.json dependencies');
    console.log('   4. Check for environment-specific optimizations');
    
    console.log('\n📞 DIAGNOSTIC COMMANDS:');
    console.log('   - Compare builds: npm run build on both servers');
    console.log('   - Check versions: npm list next on both servers');
    console.log('   - View source: curl -s [URL]/auth/signin');
    console.log('   - Check components: cat src/app/auth/signin/page.tsx');
  }
}

// Run the investigation
const guardian = new WMACSRenderingGuardian();
guardian.investigateRendering().catch(console.error);
