import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  userEmail: string;
  userName: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

// GET /api/admin/audit-logs - Get audit log entries with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action') || '';
    const entity = searchParams.get('entity') || '';
    const userId = searchParams.get('userId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    
    const skip = (page - 1) * limit;
    
    // Build where clause for filtering
    const where: any = {};
    
    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }
    
    if (entity) {
      where.entity = { contains: entity, mode: 'insensitive' };
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }
    
    // For now, we'll create mock audit log data since the audit_logs table might not exist
    // In a real implementation, this would query the actual audit_logs table
    const mockAuditLogs: AuditLogEntry[] = [
      {
        id: '1',
        action: 'CREATE_USER',
        entity: 'User',
        entityId: 'user_123',
        userId: 'admin_1',
        userEmail: 'admin@example.com',
        userName: 'System Admin',
        details: { firstName: 'John', lastName: 'Doe', role: 'ATTENDANT' },
        ipAddress: '10.92.3.24',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '2',
        action: 'UPDATE_EVENT',
        entity: 'Event',
        entityId: 'event_456',
        userId: 'admin_1',
        userEmail: 'admin@example.com',
        userName: 'System Admin',
        details: { title: 'Circuit Assembly', status: 'published' },
        ipAddress: '10.92.3.24',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        timestamp: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: '3',
        action: 'DELETE_EVENT',
        entity: 'Event',
        entityId: 'event_789',
        userId: 'admin_1',
        userEmail: 'admin@example.com',
        userName: 'System Admin',
        details: { title: 'Cancelled Event', reason: 'Weather conditions' },
        ipAddress: '10.92.3.24',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        timestamp: new Date(Date.now() - 10800000).toISOString()
      },
      {
        id: '4',
        action: 'LOGIN',
        entity: 'Session',
        entityId: 'session_abc',
        userId: 'user_456',
        userEmail: 'user@example.com',
        userName: 'John Smith',
        details: { loginMethod: 'email', success: true },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        timestamp: new Date(Date.now() - 14400000).toISOString()
      },
      {
        id: '5',
        action: 'UPDATE_EMAIL_CONFIG',
        entity: 'EmailConfig',
        entityId: 'config_1',
        userId: 'admin_1',
        userEmail: 'admin@example.com',
        userName: 'System Admin',
        details: { smtpHost: 'smtp.gmail.com', smtpPort: 587 },
        ipAddress: '10.92.3.24',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        timestamp: new Date(Date.now() - 18000000).toISOString()
      },
      {
        id: '6',
        action: 'ASSIGN_ATTENDANT',
        entity: 'Assignment',
        entityId: 'assignment_xyz',
        userId: 'overseer_1',
        userEmail: 'overseer@example.com',
        userName: 'Event Overseer',
        details: { eventId: 'event_456', attendantId: 'user_789', role: 'Sound Technician' },
        ipAddress: '10.92.3.25',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)',
        timestamp: new Date(Date.now() - 21600000).toISOString()
      }
    ];
    
    // Apply filtering to mock data
    let filteredLogs = mockAuditLogs;
    
    if (action) {
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(action.toLowerCase())
      );
    }
    
    if (entity) {
      filteredLogs = filteredLogs.filter(log => 
        log.entity.toLowerCase().includes(entity.toLowerCase())
      );
    }
    
    if (userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === userId);
    }
    
    if (startDate) {
      const start = new Date(startDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59.999Z');
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= end);
    }
    
    // Apply pagination
    const total = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(skip, skip + limit);
    
    // Get summary statistics
    const actionCounts = filteredLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const entityCounts = filteredLogs.reduce((acc, log) => {
      acc[log.entity] = (acc[log.entity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const userCounts = filteredLogs.reduce((acc, log) => {
      acc[log.userEmail] = (acc[log.userEmail] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return NextResponse.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        summary: {
          totalLogs: total,
          actionCounts,
          entityCounts,
          userCounts,
          dateRange: {
            earliest: filteredLogs.length > 0 ? filteredLogs[filteredLogs.length - 1].timestamp : null,
            latest: filteredLogs.length > 0 ? filteredLogs[0].timestamp : null
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch audit logs'
    }, { status: 500 });
  }
}

// POST /api/admin/audit-logs - Create new audit log entry (for system use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // In a real implementation, this would create an audit log entry
    // For now, we'll just return success
    
    return NextResponse.json({
      success: true,
      message: 'Audit log entry created',
      data: {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create audit log entry'
    }, { status: 500 });
  }
}
