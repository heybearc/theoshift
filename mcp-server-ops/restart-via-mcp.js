
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

async function restartApp() {
  console.log('Restarting application via MCP...');
  process.exit(0);
}

restartApp();
