'use client'

import { useSession, signOut } from '@/lib/auth-stub'
import { useEffect, useState } from 'react'

export default function AdminPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState({
    users: 0,
    events: 0,
    attendants: 0
  })

  useEffect(() => {
    // Fetch stats
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(prev => ({ ...prev, users: data.data.pagination.total }))
        }
      })
      .catch(console.error)
  }, [])

  if (!session) {
    return (
      <div className="main-container">
        <div className="page-header">
          <h1 className="page-title">Access Denied</h1>
          <p className="page-subtitle">Please sign in to access the admin panel</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Navigation Header */}
      <nav className="nav-header">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="nav-logo">JW</div>
            <h1 className="nav-title">Attendant Scheduler</h1>
          </div>
          <div className="nav-user">
            <div className="user-avatar">
              {session.user?.firstName?.charAt(0) || 'A'}
            </div>
            <div className="user-info">
              <h4>{session.user?.firstName} {session.user?.lastName}</h4>
              <p>{session.user?.role} • {session.user?.email}</p>
            </div>
            <button 
              onClick={() => signOut()} 
              className="btn"
              style={{ padding: '8px 16px', fontSize: '12px' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-container">
        <div className="page-header">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Complete administrative control for JW Attendant Scheduler</p>
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon users">👥</div>
            <div className="stat-number">{stats.users}</div>
            <div className="stat-label">Total Users</div>
            <div className="stat-change">+2 this week</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon events">📅</div>
            <div className="stat-number">{stats.events}</div>
            <div className="stat-label">Total Events</div>
            <div className="stat-change">+5 this month</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon attendants">🤝</div>
            <div className="stat-number">{stats.attendants}</div>
            <div className="stat-label">Total Attendants</div>
            <div className="stat-change">+8 active</div>
          </div>
        </div>

        {/* Admin Modules */}
        <div className="modules-section">
          <h2 className="section-title">
            <span>⚙️</span>
            Admin Modules
          </h2>
          
          <div className="modules-grid">
            <div className="module-card">
              <div className="module-icon users">👥</div>
              <h4>User Management</h4>
              <p>Create, edit, and manage user accounts with role assignments and permissions.</p>
              <a href="/admin/users" className="module-link">
                Manage Users →
              </a>
            </div>

            <div className="module-card">
              <div className="module-icon events">📧</div>
              <h4>Email Configuration</h4>
              <p>Configure SMTP settings and manage email templates for notifications.</p>
              <a href="/admin/email-config" className="module-link">
                Configure Email →
              </a>
            </div>

            <div className="module-card">
              <div className="module-icon" style={{background: 'linear-gradient(135deg, #38a169, #48bb78)'}}>💚</div>
              <h4>Health Monitor</h4>
              <p>Monitor system health, database stats, and performance metrics.</p>
              <a href="/admin/health" className="module-link">
                View Health →
              </a>
            </div>

            <div className="module-card">
              <div className="module-icon" style={{background: 'linear-gradient(135deg, #ed8936, #f6ad55)'}}>📊</div>
              <h4>API Status</h4>
              <p>Monitor API endpoints, response times, and error rates in real-time.</p>
              <a href="/admin/api-status" className="module-link">
                Check APIs →
              </a>
            </div>

            <div className="module-card">
              <div className="module-icon" style={{background: 'linear-gradient(135deg, #9f7aea, #b794f6)'}}>📋</div>
              <h4>Audit Logs</h4>
              <p>View comprehensive audit trails of all system activities and changes.</p>
              <a href="/admin/audit-logs" className="module-link">
                View Logs →
              </a>
            </div>

            <div className="module-card">
              <div className="module-icon" style={{background: 'linear-gradient(135deg, #38b2ac, #4fd1c7)'}}>⚡</div>
              <h4>System Operations</h4>
              <p>Perform system maintenance, backups, and operational tasks safely.</p>
              <a href="/admin/system-ops" className="module-link">
                System Ops →
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}