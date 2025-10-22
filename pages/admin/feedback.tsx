import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import AdminLayout from '../../components/AdminLayout'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface FeedbackItem {
  id: string
  type: 'bug' | 'enhancement' | 'feature'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'new' | 'in_progress' | 'resolved' | 'closed'
  submittedBy: {
    name: string
    email: string
    role: string
  }
  submittedAt: string
  updatedAt: string
  comments: Array<{
    id: string
    content: string
    author: string
    createdAt: string
  }>
  attachments: Array<{
    id: string
    filename: string
    url: string
    size: number
  }>
}

interface FeedbackStats {
  total: number
  new: number
  inProgress: number
  resolved: number
}

export default function FeedbackManagementPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [stats, setStats] = useState<FeedbackStats>({ total: 0, new: 0, inProgress: 0, resolved: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    fetchFeedback()
  }, [])

  const fetchFeedback = async () => {
    try {
      const response = await fetch('/api/admin/feedback')
      const data = await response.json()
      
      if (data.success) {
        setFeedback(data.data.feedback)
        setStats(data.data.stats)
      }
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return '🐛'
      case 'enhancement': return '⚡'
      case 'feature': return '✨'
      default: return '💡'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bug': return 'bg-red-100 text-red-800'
      case 'enhancement': return 'bg-blue-100 text-blue-800'
      case 'feature': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredFeedback = feedback.filter(item => {
    if (filter === 'all') return true
    return item.status === filter
  })

  const handleAddComment = async () => {
    if (!selectedFeedback || !newComment.trim()) return
    
    setSubmittingComment(true)
    try {
      const response = await fetch(`/api/admin/feedback/${selectedFeedback.id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim()
        })
      })

      if (response.ok) {
        // Refresh feedback data
        await fetchFeedback()
        // Update selected feedback with new comment
        const updatedFeedback = feedback.find(f => f.id === selectedFeedback.id)
        if (updatedFeedback) {
          setSelectedFeedback(updatedFeedback)
        }
        setNewComment('')
        setShowCommentModal(false)
      } else {
        alert('Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Error adding comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleChangeStatus = async () => {
    if (!selectedFeedback || !newStatus) return
    
    setUpdatingStatus(true)
    try {
      const response = await fetch(`/api/admin/feedback/${selectedFeedback.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        })
      })

      if (response.ok) {
        // Refresh feedback data
        await fetchFeedback()
        // Update selected feedback with new status
        const updatedFeedback = feedback.find(f => f.id === selectedFeedback.id)
        if (updatedFeedback) {
          setSelectedFeedback(updatedFeedback)
        }
        setShowStatusModal(false)
      } else {
        alert('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">💡 Feedback Management</h1>
            <p className="text-gray-600">Manage user feedback, bug reports, and feature requests</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{stats.total}</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{stats.new}</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New</p>
                <p className="text-2xl font-bold text-gray-900">{stats.new}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{stats.inProgress}</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{stats.resolved}</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex space-x-4">
            {[
              { key: 'all', label: 'All Feedback' },
              { key: 'new', label: 'New' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'resolved', label: 'Resolved' },
              { key: 'closed', label: 'Closed' }
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === filterOption.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Feedback Items ({filteredFeedback.length})
            </h3>
          </div>
          
          {filteredFeedback.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-4xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback found</h3>
              <p className="text-gray-600">No feedback items match the current filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredFeedback.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                          {getTypeIcon(item.type)} {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority.toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{item.title}</h4>
                      <p className="text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                      
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span>👤 {item.submittedBy.name} ({item.submittedBy.role})</span>
                        <span>📧 {item.submittedBy.email}</span>
                        <span>📅 {new Date(item.submittedAt).toLocaleDateString()}</span>
                        {item.attachments.length > 0 && (
                          <span>📎 {item.attachments.length} attachment{item.attachments.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => {
                          setSelectedFeedback(item)
                          setShowDetailsModal(true)
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback Details Modal */}
        {showDetailsModal && selectedFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedFeedback.type)}`}>
                        {getTypeIcon(selectedFeedback.type)} {selectedFeedback.type.charAt(0).toUpperCase() + selectedFeedback.type.slice(1)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedFeedback.priority)}`}>
                        {selectedFeedback.priority.toUpperCase()}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedFeedback.status)}`}>
                        {selectedFeedback.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedFeedback.title}</h2>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedFeedback.description}</p>
                    </div>
                  </div>

                  {/* User Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Submitted By</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Name</p>
                          <p className="text-gray-900">{selectedFeedback.submittedBy.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Email</p>
                          <p className="text-gray-900">{selectedFeedback.submittedBy.email}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Role</p>
                          <p className="text-gray-900">{selectedFeedback.submittedBy.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Timeline</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Submitted</p>
                          <p className="text-gray-900">{new Date(selectedFeedback.submittedAt).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Last Updated</p>
                          <p className="text-gray-900">{new Date(selectedFeedback.updatedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedFeedback.attachments.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Attachments</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-2">
                          {selectedFeedback.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center justify-between bg-white rounded p-3">
                              <div className="flex items-center space-x-3">
                                <span className="text-2xl">📎</span>
                                <div>
                                  <p className="font-medium text-gray-900">{attachment.filename}</p>
                                  <p className="text-sm text-gray-500">{(attachment.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                              >
                                Download
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Comments</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {selectedFeedback.comments.length === 0 ? (
                        <p className="text-gray-500 italic">No comments yet</p>
                      ) : (
                        <div className="space-y-4">
                          {selectedFeedback.comments.map((comment) => (
                            <div key={comment.id} className={`bg-white rounded p-3 border-l-4 ${
                              comment.author.includes('System') || comment.author.includes('Admin') 
                                ? 'border-blue-500' 
                                : 'border-green-500'
                            }`}>
                              <div className="flex justify-between items-start mb-2">
                                <p className="font-medium text-gray-900">
                                  {comment.author.includes('System') || comment.author.includes('Admin') ? '👨‍💼' : '👤'} {comment.author}
                                  <span className="ml-2 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                    {comment.author.includes('System') || comment.author.includes('Admin') ? 'Admin' : 'User'}
                                  </span>
                                </p>
                                <p className="text-sm text-gray-500">{new Date(comment.createdAt).toLocaleString()}</p>
                              </div>
                              <p className="text-gray-700">{comment.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => {
                      setNewComment('')
                      setShowCommentModal(true)
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    Add Comment
                  </button>
                  <button 
                    onClick={() => {
                      setNewStatus(selectedFeedback.status)
                      setShowStatusModal(true)
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Change Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Comment Modal */}
        {showCommentModal && selectedFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add Comment</h3>
                  <button
                    onClick={() => setShowCommentModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Adding comment to: <strong>{selectedFeedback.title}</strong>
                  </p>
                </div>

                <div className="mb-6">
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Comment
                  </label>
                  <textarea
                    id="comment"
                    rows={4}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your comment or response..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCommentModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddComment}
                    disabled={submittingComment || !newComment.trim()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {submittingComment ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change Status Modal */}
        {showStatusModal && selectedFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Change Status</h3>
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Changing status for: <strong>{selectedFeedback.title}</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    Current status: <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedFeedback.status)}`}>
                      {selectedFeedback.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </p>
                </div>

                <div className="mb-6">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    New Status
                  </label>
                  <select
                    id="status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="new">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangeStatus}
                    disabled={updatingStatus || newStatus === selectedFeedback.status}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {updatingStatus ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  if (session.user?.role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/admin',
        permanent: false,
      },
    }
  }

  return {
    props: {},
  }
}
