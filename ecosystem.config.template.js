/**
 * PM2 Ecosystem Configuration Template
 * 
 * IMPORTANT: This file should ONLY contain PM2 process management settings.
 * DO NOT add environment variables here - use .env.green instead.
 * 
 * To use:
 * 1. Copy this file to ecosystem.config.js on your server
 * 2. Adjust PM2 settings if needed (name, instances, memory limits)
 * 3. Never add env variables - they belong in .env.green
 */

module.exports = {
  apps: [{
    // Process name (can be different per server: theoshift-blue, theoshift-green)
    name: 'theoshift-green',
    
    // How to start the app
    script: 'npm',
    args: 'start -- --port 3001',
    cwd: '/opt/theoshift',
    
    // Process management
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // DO NOT ADD env OBJECT HERE!
    // All environment variables should be in .env.green
    // PM2 will automatically load .env.green when NODE_ENV=production
  }]
}
