import { WMACSServerOps } from './mcp-server-ops/src/index.js';

async function checkAndStartMCPServers() {
  const wmacs = new WMACSServerOps();
  
  const mcpServers = [
    {
      name: 'mcp-server-github',
      path: '/Users/cory/Documents/Cloudy-Work/homelab/mcp-server-github',
      port: 3001
    },
    {
      name: 'mcp-server-proxmox', 
      path: '/Users/cory/Documents/Cloudy-Work/homelab/mcp-server-proxmox',
      port: 3002
    },
    {
      name: 'wmacs-server-ops',
      path: '/Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler/mcp-server-ops',
      port: 3003
    }
  ];

  console.log('🔍 Checking MCP server status...');
  
  for (const server of mcpServers) {
    try {
      console.log(`\n📋 Checking ${server.name}...`);
      
      // Check if server is already running
      const checkCommand = `ps aux | grep "${server.name}" | grep -v grep`;
      console.log(`Running: ${checkCommand}`);
      
      // Check if dependencies are installed
      const depCheckCommand = `cd ${server.path} && [ -d "node_modules" ] && echo "Dependencies installed" || echo "Dependencies missing"`;
      console.log(`Checking dependencies: ${depCheckCommand}`);
      
      // Build if needed
      const buildCommand = `cd ${server.path} && npm run build`;
      console.log(`Building: ${buildCommand}`);
      
      // Start server
      const startCommand = `cd ${server.path} && npm start`;
      console.log(`Starting: ${startCommand}`);
      
    } catch (error) {
      console.error(`❌ Error with ${server.name}:`, error);
    }
  }
  
  console.log('\n✅ MCP server status check completed');
}

checkAndStartMCPServers();
