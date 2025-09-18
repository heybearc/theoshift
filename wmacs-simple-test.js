#!/usr/bin/env node

// WMACS: Simple Test Using MCP Proxmox Server
const { spawn } = require('child_process');

async function wmacsSimpleTest() {
  console.log('🔧 WMACS: Testing with MCP Proxmox server');
  
  // Use MCP client to execute commands
  const mcpClient = spawn('node', ['/Users/cory/Documents/Cloudy-Work/homelab/mcp-server-proxmox/src/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Send command to create test file
  const command = {
    method: 'execute_command',
    params: {
      container_id: 'staging',
      command: 'echo "<html><body><h1>Test Login</h1><form id=\\"f\\"><input id=\\"e\\" value=\\"admin@jwscheduler.local\\"><input id=\\"p\\" type=\\"password\\" value=\\"AdminPass123!\\"><button onclick=\\"login()\\">Login</button></form><div id=\\"r\\"></div><script>function login(){fetch(\\"/api/auth/login\\",{method:\\"POST\\",headers:{\\"Content-Type\\":\\"application/json\\"},credentials:\\"include\\",body:JSON.stringify({email:document.getElementById(\\"e\\").value,password:document.getElementById(\\"p\\").value})}).then(r=>r.json()).then(d=>document.getElementById(\\"r\\").innerHTML=JSON.stringify(d))}</script></body></html>" > /opt/jw-attendant-scheduler/current/public/simple-test.html'
    }
  };

  mcpClient.stdin.write(JSON.stringify(command) + '\n');
  
  mcpClient.stdout.on('data', (data) => {
    console.log('MCP Response:', data.toString());
  });

  mcpClient.stderr.on('data', (data) => {
    console.error('MCP Error:', data.toString());
  });

  setTimeout(() => {
    mcpClient.kill();
    console.log('✅ Test file should be created at: http://10.92.3.24:3001/simple-test.html');
  }, 3000);
}

wmacsSimpleTest().catch(console.error);
