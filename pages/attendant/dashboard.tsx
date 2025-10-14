import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'

interface Attendant {
  id: string
  firstName: string
  lastName: string
  congregation: string
  email: string
  phone: string
  profileVerificationRequired?: boolean
  profileVerifiedAt?: string
}

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
  status: string
}

interface Assignment {
  id: string
  positionName: string
  startTime: string
  endTime: string
  location?: string
  instructions?: string
  overseer?: string
  keyman?: string
}

interface Document {
  id: string
  title: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  description?: string
  publishedAt: string
}

interface OversightContact {
  name: string
  role: string
  phone?: string
  email?: string
}

interface DashboardData {
  attendant: Attendant
  event: Event
  assignments: Assignment[]
  documents: Document[]
  oversight: OversightContact[]
}

export default function AttendantDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [attendant, setAttendant] = useState<Attendant | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [showProfileVerification, setShowProfileVerification] = useState(false)
  const [profileData, setProfileData] = useState({ email: '', phone: '' })
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editProfileData, setEditProfileData] = useState({ email: '', phone: '' })

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      // Load attendant session
      const sessionData = localStorage.getItem('attendantSession')
      const eventId = localStorage.getItem('selectedEventId')

      if (!sessionData || !eventId) {
        router.push('/attendant/login')
        return
      }

      const session = JSON.parse(sessionData)
      setAttendant(session.attendant)
      setSelectedEventId(eventId)

      // Fetch dashboard data (using test endpoint temporarily)
      const response = await fetch(`/api/attendant/dashboard-test?attendantId=${session.attendant.id}&eventId=${eventId}`)
      const result = await response.json()

      if (result.success) {
        setDashboardData(result.data)
        
        // Check if profile verification is required (admin-forced OR first login)
        const hasVerified = localStorage.getItem('profileVerified')
        const adminForced = result.data.attendant.profileVerificationRequired
        
        if (adminForced || !hasVerified) {
          // Pre-fill with existing data
          setProfileData({
            email: result.data.attendant.email || '',
            phone: result.data.attendant.phone || ''
          })
          setShowProfileVerification(true)
        }
      } else {
        setError(result.error || 'Failed to load dashboard')
      }
    } catch (error) {
      setError('An error occurred while loading your dashboard')
    } finally {
      setLoading(false)
    }
  }
  
  const handleProfileVerification = async () => {
    try {
      // Update profile via API
      const response = await fetch(`/api/attendant/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendantId: attendant?.id,
          email: profileData.email,
          phone: profileData.phone
        })
      })
      
      if (response.ok) {
        localStorage.setItem('profileVerified', 'true')
        setShowProfileVerification(false)
        // Reload dashboard to get updated data
        loadDashboard()
      }
    } catch (error) {
      console.error('Profile update failed:', error)
    }
  }

  const handleEditProfile = () => {
    setEditProfileData({
      email: dashboardData?.attendant.email || '',
      phone: dashboardData?.attendant.phone || ''
    })
    setIsEditingProfile(true)
  }

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`/api/attendant/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendantId: attendant?.id,
          email: editProfileData.email,
          phone: editProfileData.phone
        })
      })
      
      if (response.ok) {
        setIsEditingProfile(false)
        // Reload dashboard to get updated data
        loadDashboard()
      } else {
        alert('Failed to update profile')
      }
    } catch (error) {
      console.error('Profile update failed:', error)
      alert('Failed to update profile')
    }
  }

  const handleCancelEdit = () => {
    setIsEditingProfile(false)
    setEditProfileData({ email: '', phone: '' })
  }

  const handleLogout = () => {
    localStorage.removeItem('attendantSession')
    localStorage.removeItem('selectedEventId')
    router.push('/attendant/login')
  }

  const handleSwitchEvent = () => {
    router.push('/attendant/select-event')
  }

  const formatDate = (dateString: string) => {
    // Parse date string as-is without timezone conversion
    // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
    const datePart = dateString.split('T')[0]
    const date = new Date(datePart + 'T12:00:00') // Use noon to avoid timezone edge cases
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('video')) return '🎥'
    if (fileType.includes('audio')) return '🎵'
    if (fileType.includes('text')) return '📝'
    return '📎'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/attendant/login')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>My Dashboard | JW Attendant Scheduler</title>
      </Head>

      {/* Profile Verification Modal */}
      {showProfileVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Information</h2>
              <p className="text-sm text-gray-600">
                Please confirm or update your contact information. This helps us keep you informed about your assignments.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Your information is kept confidential and only used for event coordination.
                </p>
              </div>

              <button
                onClick={handleProfileVerification}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Confirm Information
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">📋</span>
                <span className="ml-2 text-xl font-semibold text-gray-900">
                  JW Attendant Scheduler
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {attendant?.firstName} {attendant?.lastName}
                </span>
                <button
                  onClick={handleSwitchEvent}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Switch Event
                </button>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {dashboardData.attendant.firstName}!
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              {dashboardData.event.name}
            </p>
            <p className="text-sm text-gray-500">
              {formatDate(dashboardData.event.startDate)} - {formatDate(dashboardData.event.endDate)}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* My Assignments */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="text-xl mr-2">📋</span>
                    My Assignments
                  </h2>
                </div>
                <div className="p-6">
                  {dashboardData.assignments.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">📝</div>
                      <p className="text-gray-600">No assignments yet</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Check back later or contact your overseer
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.assignments.map((assignment) => (
                        <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">{assignment.positionName}</h3>
                              {assignment.location && (
                                <p className="text-sm text-gray-600 mt-1">📍 {assignment.location}</p>
                              )}
                              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                <span>🕐 {formatTime(assignment.startTime)} - {formatTime(assignment.endTime)}</span>
                              </div>
                              {assignment.instructions && (
                                <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                                  {assignment.instructions}
                                </p>
                              )}
                              {(assignment.overseer || assignment.keyman) && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1">Position Oversight:</p>
                                  <div className="flex flex-wrap gap-3 text-sm">
                                    {assignment.overseer && (
                                      <span className="text-blue-600">
                                        👤 Overseer: {assignment.overseer}
                                      </span>
                                    )}
                                    {assignment.keyman && (
                                      <span className="text-green-600">
                                        🔑 Keyman: {assignment.keyman}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="text-xl mr-2">📄</span>
                    My Documents
                  </h2>
                </div>
                <div className="p-6">
                  {dashboardData.documents.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">📄</div>
                      <p className="text-gray-600">No documents available</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Documents will appear here when published by your overseer
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.documents.map((document) => (
                        <div key={document.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="text-2xl">{getFileIcon(document.fileType)}</div>
                              <div>
                                <h3 className="font-medium text-gray-900">{document.title}</h3>
                                {document.description && (
                                  <p className="text-sm text-gray-600 mt-1">{document.description}</p>
                                )}
                                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                  <span>📁 {document.fileName}</span>
                                  <span>📏 {formatFileSize(document.fileSize)}</span>
                                  <span>📅 {formatDate(document.publishedAt)}</span>
                                </div>
                              </div>
                            </div>
                            <a
                              href={document.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                            >
                              👁️ View
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Personal Info */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="text-xl mr-2">👤</span>
                    My Information
                  </h3>
                  {!isEditingProfile && (
                    <button
                      onClick={handleEditProfile}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                  )}
                </div>
                
                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <span className="text-gray-500 text-sm">Name:</span>
                      <p className="font-medium text-gray-400">{dashboardData.attendant.firstName} {dashboardData.attendant.lastName} (cannot be changed)</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">Congregation:</span>
                      <p className="font-medium text-gray-400">{dashboardData.attendant.congregation} (cannot be changed)</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Email:</label>
                      <input
                        type="email"
                        value={editProfileData.email}
                        onChange={(e) => setEditProfileData({ ...editProfileData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Phone:</label>
                      <input
                        type="tel"
                        value={editProfileData.phone}
                        onChange={(e) => setEditProfileData({ ...editProfileData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <p className="font-medium">{dashboardData.attendant.firstName} {dashboardData.attendant.lastName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Congregation:</span>
                      <p className="font-medium">{dashboardData.attendant.congregation}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <p className="font-medium">{dashboardData.attendant.email || <span className="text-gray-400">Not provided</span>}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <p className="font-medium">{dashboardData.attendant.phone || <span className="text-gray-400">Not provided</span>}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Oversight Contacts */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <span className="text-xl mr-2">👥</span>
                  My Oversight
                </h3>
                {dashboardData.oversight.length === 0 ? (
                  <p className="text-sm text-gray-600">No oversight contacts assigned</p>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.oversight.map((contact, index) => (
                      <div key={index} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          <p className="text-gray-600">{contact.role}</p>
                          {contact.phone && (
                            <p className="text-gray-600">📞 {contact.phone}</p>
                          )}
                          {contact.email && (
                            <p className="text-gray-600">📧 {contact.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Event Information</h3>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>Type:</strong> {dashboardData.event.eventType}</p>
                  <p><strong>Status:</strong> {dashboardData.event.status}</p>
                  <p><strong>Dates:</strong> {formatDate(dashboardData.event.startDate)} - {formatDate(dashboardData.event.endDate)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
