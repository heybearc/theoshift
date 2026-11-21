import { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import AdminLayout from '../../components/AdminLayout'
import { format, parseISO } from 'date-fns'
import { appConfirm, appConfirmMessage } from '../../lib/ui/confirm'

interface GlobalAnnouncement {
  id: string
  title: string
  message: string
  type: string
  isActive: boolean
  startDate: string | null
  endDate: string | null
  createdAt: string
  users: { firstName: string; lastName: string }
}

interface Props {
  userLastSeenVersion?: string | null
}

const TYPE_OPTIONS = [
  { value: 'INFO', label: 'ℹ️ Info', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'WARNING', label: '⚠️ Warning', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'URGENT', label: '🚨 Urgent', color: 'bg-red-100 text-red-800 border-red-200' },
]

function typeColor(type: string) {
  return TYPE_OPTIONS.find(t => t.value === type)?.color ?? 'bg-gray-100 text-gray-800'
}

const EMPTY_FORM = { title: '', message: '', type: 'INFO', startDate: '', endDate: '' }

export default function GlobalAnnouncementsPage({ userLastSeenVersion }: Props) {
  const [announcements, setAnnouncements] = useState<GlobalAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/global-announcements')
      const data = await res.json()
      if (data.success) setAnnouncements(data.data)
    } finally {
      setLoading(false)
    }
  }

  // Load on mount
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  const openEdit = (a: GlobalAnnouncement) => {
    setEditingId(a.id)
    setForm({
      title: a.title,
      message: a.message,
      type: a.type,
      startDate: a.startDate ? a.startDate.split('T')[0] : '',
      endDate: a.endDate ? a.endDate.split('T')[0] : '',
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const url = editingId
        ? `/api/admin/global-announcements/${editingId}`
        : '/api/admin/global-announcements'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
        })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to save')
      setShowModal(false)
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    await fetch(`/api/admin/global-announcements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current })
    })
    await load()
  }

  const handleDelete = async (id: string, title: string) => {
    if (!(await appConfirmMessage(`Delete "${title}"? This cannot be undone.`))) return
    await fetch(`/api/admin/global-announcements/${id}`, { method: 'DELETE' })
    await load()
  }

  const formatDate = (d: string | null) => {
    if (!d) return null
    try { return format(parseISO(d.split('T')[0]), 'MMM d, yyyy') } catch { return d }
  }

  return (
    <AdminLayout title="Global Announcements" userLastSeenVersion={userLastSeenVersion}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Global Announcements</h1>
            <p className="text-gray-600 mt-1">System-wide banners shown to all users across the platform.</p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            + New Announcement
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
          <strong>ℹ️ Global vs Event Announcements:</strong> These appear on all pages for all users.
          Use event-specific announcements (within an event's Announcements tab) to target volunteers for a specific event.
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="text-5xl mb-4">📢</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No global announcements</h3>
            <p className="text-gray-500 mb-6">Create one to display a system-wide banner to all users.</p>
            <button
              onClick={openCreate}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
            >
              Create First Announcement
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <div key={a.id} className={`bg-white border rounded-lg p-5 shadow-sm ${!a.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-semibold text-gray-900 text-base">{a.title}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${typeColor(a.type)}`}>
                        {a.type}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        a.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {a.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap mb-3">{a.message}</p>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {a.startDate && <p>📅 Show from: {formatDate(a.startDate)}</p>}
                      {a.endDate && <p>📅 Hide after: {formatDate(a.endDate)}</p>}
                      <p>Created by {a.users.firstName} {a.users.lastName} · {formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(a)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleToggle(a.id, a.isActive)}
                      className={`px-3 py-1.5 text-white text-sm rounded transition-colors ${
                        a.isActive
                          ? 'bg-yellow-600 hover:bg-yellow-700'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {a.isActive ? '⏸ Deactivate' : '▶ Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(a.id, a.title)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Announcement' : 'New Global Announcement'}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Scheduled Maintenance Tonight"
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
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., TheoShift will be unavailable from 11 PM – 1 AM for maintenance."
                    required
                    maxLength={1000}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TYPE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (optional)</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={e => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">When to start showing</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={e => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">When to stop showing</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session || session.user?.role !== 'ADMIN') {
    return { redirect: { destination: '/admin', permanent: false } }
  }
  return { props: { userLastSeenVersion: null } }
}
