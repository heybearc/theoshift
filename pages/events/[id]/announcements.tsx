import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventLayout from '../../../components/EventLayout'
import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

interface Announcement {
  id: string
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'URGENT'
  isActive: boolean
  startDate?: string
  endDate?: string
  createdAt: string
  users: {
    firstName: string
    lastName: string
  }
}

interface Event {
  id: string
  name: string
}

interface EventAnnouncementsPageProps {
  eventId: string
  event: Event
  announcements: Announcement[]
  canManage: boolean
}

export default function EventAnnouncementsPage({ eventId, event, announcements, canManage }: EventAnnouncementsPageProps) {
  const router = useRouter()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'INFO' as 'INFO' | 'WARNING' | 'URGENT',
    startDate: '',
    endDate: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const url = editingId
        ? `/api/events/${eventId}/announcements/${editingId}`
        : `/api/events/${eventId}/announcements`
      
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save announcement')
      }

      setShowCreateModal(false)
      setEditingId(null)
      setFormData({ title: '', message: '', type: 'INFO', startDate: '', endDate: '' })
      router.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id)
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      startDate: announcement.startDate ? announcement.startDate.split('T')[0] : '',
      endDate: announcement.endDate ? announcement.endDate.split('T')[0] : ''
    })
    setShowCreateModal(true)
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/events/${eventId}/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (!response.ok) throw new Error('Failed to update announcement')
      router.reload()
    } catch (err) {
      alert('Failed to update announcement status')
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    try {
      const response = await fetch(`/api/events/${eventId}/announcements/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete announcement')
      router.reload()
    } catch (err) {
      alert('Failed to delete announcement')
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'URGENT': return 'bg-red-100 text-red-800'
      case 'WARNING': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <EventLayout
      title="Announcements"
      breadcrumbs={[
        { label: 'Events', href: '/events' },
        { label: event.name, href: `/events/${eventId}` },
        { label: 'Announcements' }
      ]}
      selectedEvent={{
        id: event.id,
        name: event.name
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
              <p className="text-gray-600">Manage banner announcements for attendants</p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/events/${eventId}`}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ← Back to Event
              </Link>
              {canManage && (
                <button
                  onClick={() => {
                    setEditingId(null)
                    setFormData({ title: '', message: '', type: 'INFO', startDate: '', endDate: '' })
                    setShowCreateModal(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  ➕ New Announcement
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Announcements List */}
        {announcements.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">📢</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Announcements</h3>
            <p className="text-gray-500 text-lg mb-4">
              {canManage ? 'Create your first announcement to notify attendants' : 'No announcements available'}
            </p>
            {canManage && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Create First Announcement
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(announcement.type)}`}>
                        {announcement.type}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        announcement.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {announcement.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap mb-3">{announcement.message}</p>
                    <div className="text-sm text-gray-500 space-y-1">
                      {announcement.startDate && (
                        <p>📅 Start: {format(parseISO(announcement.startDate.split('T')[0]), 'MM/dd/yyyy')}</p>
                      )}
                      {announcement.endDate && (
                        <p>📅 End: {format(parseISO(announcement.endDate.split('T')[0]), 'MM/dd/yyyy')}</p>
                      )}
                      <p>Created by {announcement.users.firstName} {announcement.users.lastName}</p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(announcement.id, announcement.isActive)}
                        className={`${
                          announcement.isActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'
                        } text-white px-3 py-1 rounded text-sm transition-colors`}
                      >
                        {announcement.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id, announcement.title)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Edit Announcement' : 'Create Announcement'}
                </h3>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="px-6 py-4 space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Attendant Meeting - November 2"
                      required
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., All attendants please meet at 7:00 AM on November 2 for important updates."
                      required
                      maxLength={1000}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="INFO">ℹ️ Info (Blue)</option>
                      <option value="WARNING">⚠️ Warning (Yellow)</option>
                      <option value="URGENT">🚨 Urgent (Red)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">When to start showing</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">When to stop showing</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingId(null)
                      setError('')
                    }}
                    disabled={submitting}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Saving...' : editingId ? 'Update Announcement' : 'Create Announcement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </EventLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session || !session.user) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false
      }
    }
  }

  try {
    const { prisma } = await import('../../../src/lib/prisma')

    const event = await prisma.events.findUnique({
      where: { id: id as string },
      select: { id: true, name: true }
    })

    if (!event) {
      return { notFound: true }
    }

    const announcements = await prisma.announcements.findMany({
      where: { eventId: id as string },
      include: {
        users: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { type: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    const user = await prisma.users.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    })

    const canManage = user && ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN'].includes(user.role)

    return {
      props: {
        eventId: id as string,
        event: {
          id: event.id,
          name: event.name
        },
        announcements: announcements.map(a => ({
          id: a.id,
          title: a.title,
          message: a.message,
          type: a.type,
          isActive: a.isActive,
          startDate: a.startDate?.toISOString() || null,
          endDate: a.endDate?.toISOString() || null,
          createdAt: a.createdAt.toISOString(),
          users: {
            firstName: a.users.firstName,
            lastName: a.users.lastName
          }
        })),
        canManage
      }
    }
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return { notFound: true }
  }
}
