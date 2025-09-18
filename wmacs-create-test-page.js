#!/usr/bin/env node

// WMACS: Create Simple Test Login Page
// Use MCP to create a working test login page

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function wmacsCreateTestPage() {
  console.log('🔧 WMACS: Creating test login page');
  
  try {
    // Step 1: Create simple test HTML file
    console.log('📝 Step 1: Creating test-login.html');
    const createFile = `ssh root@10.92.3.24 "cat > /tmp/test-login.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Login Test</title></head>
<body>
<h2>Direct Login Test</h2>
<form id=\"loginForm\">
Email: <input type=\"email\" id=\"email\" value=\"admin@jwscheduler.local\"><br><br>
Password: <input type=\"password\" id=\"password\" value=\"AdminPass123!\"><br><br>
<button type=\"submit\">Login</button>
</form>
<div id=\"result\"></div>
<script>
document.getElementById('loginForm').onsubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({email, password})
    });
    const data = await response.json();
    document.getElementById('result').innerHTML = 'Result: ' + JSON.stringify(data);
  } catch(err) {
    document.getElementById('result').innerHTML = 'Error: ' + err.message;
  }
};
</script>
</body>
</html>
EOF"`;

    await execAsync(createFile);
    console.log('✅ Test file created in /tmp');

    // Step 2: Move to public directory
    console.log('📂 Step 2: Moving to public directory');
    const moveFile = `ssh root@10.92.3.24 "cp /tmp/test-login.html /opt/jw-attendant-scheduler/current/public/"`;
    await execAsync(moveFile);
    console.log('✅ File moved to public directory');

    // Step 3: Test access
    console.log('🌐 Step 3: Testing access');
    const testAccess = await execAsync('curl -s http://10.92.3.24:3001/test-login.html | head -5');
    console.log('Test page response:');
    console.log(testAccess.stdout);

    console.log('\n✅ WMACS: Test page created successfully');
    console.log('🔗 Access at: http://10.92.3.24:3001/test-login.html');

  } catch (error) {
    console.error('❌ WMACS Error:', error.message);
  }
}

wmacsCreateTestPage().catch(console.error);
