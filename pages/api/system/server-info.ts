import { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import { promises as fs } from 'fs';

const STATE_FILE_PATH = '/opt/theoshift/deployment-state.json';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the server's hostname to determine which server we're on
    const hostname = os.hostname();
    
    // Determine server based on hostname or environment
    // Container 134 (BLUE) = 10.92.3.24 - hostname: blue-theoshift
    // Container 132 (GREEN) = 10.92.3.22 - hostname: green-theoshift
    
    let server: 'BLUE' | 'GREEN' = 'BLUE';
    let container = 134;
    let ip = '10.92.3.24';
    
    // Check if we can determine from hostname or environment
    if (hostname.includes('green') || hostname.includes('132') || process.env.SERVER_NAME === 'GREEN') {
      server = 'GREEN';
      container = 132;
      ip = '10.92.3.22';
    } else if (hostname.includes('blue') || hostname.includes('134') || process.env.SERVER_NAME === 'BLUE') {
      server = 'BLUE';
      container = 134;
      ip = '10.92.3.24';
    }
    
    // Determine if this is LIVE or STANDBY by reading local deployment state file
    let status: 'LIVE' | 'STANDBY' = 'STANDBY';
    
    try {
      // Try to read the local deployment state file
      const stateData = await fs.readFile(STATE_FILE_PATH, 'utf-8');
      const state = JSON.parse(stateData);
      
      // Check which server is currently LIVE
      const liveServer = state.live || state.prod || 'green';
      if (liveServer.toLowerCase() === server.toLowerCase()) {
        status = 'LIVE';
      } else {
        status = 'STANDBY';
      }
    } catch (error) {
      // If state file doesn't exist or can't be read, use environment variable
      if (process.env.SERVER_STATUS) {
        status = process.env.SERVER_STATUS as 'LIVE' | 'STANDBY';
      } else {
        // Default fallback: GREEN is LIVE (matches HAProxy default)
        status = server === 'GREEN' ? 'LIVE' : 'STANDBY';
      }
    }
    
    return res.status(200).json({
      server,
      status,
      ip,
      container,
      hostname
    });
  } catch (error) {
    console.error('Error getting server info:', error);
    return res.status(500).json({ error: 'Failed to get server info' });
  }
}
