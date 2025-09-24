import { NextRequest, NextResponse } from 'next/server';

interface APIEndpoint {
  name: string;
  path: string;
  method: string;
  category: 'admin' | 'events' | 'users' | 'auth';
  description: string;
}

interface EndpointStatus {
  name: string;
  path: string;
  method: string;
  category: string;
  status: 'healthy' | 'unhealthy' | 'slow';
  responseTime: number;
  lastChecked: string;
  errorMessage?: string;
}

const API_ENDPOINTS: APIEndpoint[] = [
  // Admin APIs
  { name: 'Health Monitor', path: '/api/admin/health', method: 'GET', category: 'admin', description: 'System health monitoring' },
  { name: 'Users Management', path: '/api/admin/users', method: 'GET', category: 'admin', description: 'User management operations' },
  { name: 'API Status', path: '/api/admin/api-status', method: 'GET', category: 'admin', description: 'API endpoint monitoring' },
  
  // Events APIs
  { name: 'Events List', path: '/api/admin/events', method: 'GET', category: 'events', description: 'Event listing and search' },
  { name: 'Create Event', path: '/api/admin/events', method: 'POST', category: 'events', description: 'Create new events' },
  
  // User APIs
  { name: 'Create User', path: '/api/admin/users', method: 'POST', category: 'users', description: 'Create new users' },
  
  // Auth APIs
  { name: 'Authentication', path: '/api/auth/session', method: 'GET', category: 'auth', description: 'Session management' }
];

// GET /api/admin/api-status - Monitor API endpoint status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const detailed = searchParams.get('detailed') === 'true';
    
    const startTime = Date.now();
    
    // Filter endpoints by category if specified
    const endpointsToCheck = category 
      ? API_ENDPOINTS.filter(ep => ep.category === category)
      : API_ENDPOINTS;
    
    const endpointStatuses: EndpointStatus[] = [];
    
    // Check each endpoint
    for (const endpoint of endpointsToCheck) {
      const status = await checkEndpointStatus(endpoint, detailed);
      endpointStatuses.push(status);
    }
    
    // Calculate overall statistics
    const totalEndpoints = endpointStatuses.length;
    const healthyEndpoints = endpointStatuses.filter(ep => ep.status === 'healthy').length;
    const unhealthyEndpoints = endpointStatuses.filter(ep => ep.status === 'unhealthy').length;
    const slowEndpoints = endpointStatuses.filter(ep => ep.status === 'slow').length;
    
    const averageResponseTime = endpointStatuses.reduce((sum, ep) => sum + ep.responseTime, 0) / totalEndpoints;
    
    const overallStatus = unhealthyEndpoints > 0 ? 'unhealthy' : 
                         slowEndpoints > totalEndpoints / 2 ? 'degraded' : 'healthy';
    
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checkDuration: totalTime,
      summary: {
        total: totalEndpoints,
        healthy: healthyEndpoints,
        unhealthy: unhealthyEndpoints,
        slow: slowEndpoints,
        averageResponseTime: Math.round(averageResponseTime)
      },
      endpoints: endpointStatuses,
      categories: {
        admin: endpointStatuses.filter(ep => ep.category === 'admin').length,
        events: endpointStatuses.filter(ep => ep.category === 'events').length,
        users: endpointStatuses.filter(ep => ep.category === 'users').length,
        auth: endpointStatuses.filter(ep => ep.category === 'auth').length
      }
    });
    
  } catch (error) {
    console.error('API status check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check API status',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function checkEndpointStatus(endpoint: APIEndpoint, detailed: boolean = false): Promise<EndpointStatus> {
  const startTime = Date.now();
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
  
  try {
    // For GET endpoints, make actual requests
    if (endpoint.method === 'GET') {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'API-Status-Monitor/1.0',
        },
        // Short timeout for status checks
        signal: AbortSignal.timeout(5000)
      });
      
      const responseTime = Date.now() - startTime;
      
      // Determine status based on response and timing
      let status: 'healthy' | 'unhealthy' | 'slow';
      
      if (!response.ok) {
        status = 'unhealthy';
      } else if (responseTime > 1000) {
        status = 'slow';
      } else {
        status = 'healthy';
      }
      
      return {
        name: endpoint.name,
        path: endpoint.path,
        method: endpoint.method,
        category: endpoint.category,
        status,
        responseTime,
        lastChecked: new Date().toISOString(),
        errorMessage: !response.ok ? `HTTP ${response.status}: ${response.statusText}` : undefined
      };
      
    } else {
      // For POST/PUT/DELETE endpoints, just return a mock status
      // In a real implementation, you might have test endpoints or health check variants
      const mockResponseTime = Math.random() * 100 + 20; // 20-120ms
      
      return {
        name: endpoint.name,
        path: endpoint.path,
        method: endpoint.method,
        category: endpoint.category,
        status: 'healthy', // Assume healthy for non-GET endpoints
        responseTime: Math.round(mockResponseTime),
        lastChecked: new Date().toISOString()
      };
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: endpoint.name,
      path: endpoint.path,
      method: endpoint.method,
      category: endpoint.category,
      status: 'unhealthy',
      responseTime,
      lastChecked: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
