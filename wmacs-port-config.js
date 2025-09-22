// WMACS IMMUTABLE PORT CONFIGURATION
// ⚠️ WARNING: DO NOT MODIFY - This is an immutable reference
export const WMACS_IMMUTABLE_PORT = 3001;

// Port validation function
export function validatePort(port) {
  if (port !== WMACS_IMMUTABLE_PORT) {
    throw new Error(`WMACS Guardian: Invalid port ${port}. Must use port ${WMACS_IMMUTABLE_PORT}`);
  }
  return true;
}

// Environment port getter with validation
export function getWMACSPort() {
  const envPort = process.env.PORT ? parseInt(process.env.PORT) : WMACS_IMMUTABLE_PORT;
  validatePort(envPort);
  return envPort;
}

// Production deployment URLs
export const WMACS_URLS = {
  staging: 'http://10.92.3.24:3001',
  production: 'http://10.92.3.22:3001',
  local: 'http://localhost:3001'
};

console.log('🔒 WMACS Guardian: Port 3001 enforced');
