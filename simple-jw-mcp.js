#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

class SimpleJWMCP {
  constructor() {
    this.server = new Server(
      { name: 'simple-jw-mcp', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'jw_status_check',
          description: 'Check Theocratic Shift Scheduler status',
          inputSchema: {
            type: 'object',
            properties: { message: { type: 'string' } },
            required: ['message']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (name === 'jw_status_check') {
        return {
          content: [{
            type: 'text',
            text: `✅ Theocratic Shift Scheduler MCP is working! Message: ${args.message}`
          }]
        };
      }
      
      throw new Error(`Unknown tool: ${name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Simple JW MCP server running');
  }
}

if (require.main === module) {
  const server = new SimpleJWMCP();
  server.run().catch(console.error);
}

module.exports = SimpleJWMCP;
