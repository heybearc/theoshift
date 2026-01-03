'use client';

import { useState, useEffect } from 'react';

interface ServerInfo {
  server: 'BLUE' | 'GREEN';
  status: 'LIVE' | 'STANDBY';
  ip: string;
  container: number;
}

export default function ServerIndicator() {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchServerInfo();
    // Refresh every 5 minutes
    const interval = setInterval(fetchServerInfo, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchServerInfo = async () => {
    try {
      const response = await fetch('/api/system/server-info');
      if (response.ok) {
        const data = await response.json();
        setServerInfo(data);
      }
    } catch (error) {
      // Silently fail - indicator just won't show
    }
  };

  if (!serverInfo) return null;

  const statusColor = serverInfo.status === 'LIVE' ? 'bg-green-500' : 'bg-blue-500';
  const statusDot = serverInfo.status === 'LIVE' ? '🟢' : '🔵';

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      {/* Subtle indicator - just a small colored dot */}
      <div className="flex items-center space-x-1 cursor-help">
        <div className={`w-2 h-2 rounded-full ${statusColor} opacity-50`} />
      </div>

      {/* Tooltip on hover */}
      {showDetails && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
          <div className="space-y-1">
            <div className="font-semibold">{statusDot} {serverInfo.server} - {serverInfo.status}</div>
            <div className="text-gray-300">Container {serverInfo.container}</div>
            <div className="text-gray-400 text-[10px]">{serverInfo.ip}</div>
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full right-4 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}
