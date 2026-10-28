import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventPageWrapper from '../../../components/EventPageWrapper'
import { useEffect, useState } from 'react'
import { useShiftRangeSelection } from '../../../hooks/useShiftRangeSelection'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { appConfirm, appConfirmMessage } from '../../../lib/ui/confirm'

interface Document {
  id: string
  title: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedBy: string
  uploadedAt: string
  publishedTo: 'all' | 'individual' | 'none'
  publishedCount: number
  description?: string
  /** False when no blob exists on disk for this row (re-upload required). */
  fileOnDisk: boolean
}

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
  status: string
}

interface Volunteer {
  id: string
  firstName: string
  lastName: string
  congregation: string
  email?: string
}

interface EventDocumentsPageProps {
  eventId: string
  event: Event
  documents: Document[]
  canEdit: boolean
  canDelete: boolean
  canManagePermissions: boolean
  attendants: Volunteer[]
  moduleConfig?: any
  terminology?: any
}

export default function EventDocumentsPage({ eventId, event, documents, canEdit, canDelete, canManagePermissions, attendants, moduleConfig, terminology }: EventDocumentsPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [publishType, setPublishType] = useState<'all' | 'individual'>('all')
  const [selectedAttendants, setSelectedAttendants] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const publishRange = useShiftRangeSelection()

  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    file: null as File | null
  })

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadData.file || !uploadData.title) {
      setError('Please provide a title and select a file')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', uploadData.file)
      formData.append('title', uploadData.title)
      formData.append('description', uploadData.description)

      const response = await fetch(`/api/events/${eventId}/documents`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const text = await response.text()
        console.error('Upload failed:', response.status, text)
        setError(`Upload failed: ${response.status} - ${text.substring(0, 100)}`)
        return
      }

      const result = await response.json()

      if (result.success) {
        setSuccess('Document uploaded successfully!')
        setShowUploadForm(false)
        setUploadData({ title: '', description: '', file: null })
        router.reload() // Refresh to show new document
      } else {
        setError(result.error || 'Failed to upload document')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError(`An error occurred while uploading: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePublishDocument = async () => {
    if (!selectedDocument) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/events/${eventId}/documents/${selectedDocument.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publishType,
          attendantIds: publishType === 'individual' ? selectedAttendants : undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        const count = result.data?.publishedCount ?? selectedAttendants.length
        setSuccess(
          publishType === 'all'
            ? `Document published to all ${count} roster volunteers`
            : `Document published to ${count} volunteers`
        )
        setShowPublishModal(false)
        setSelectedDocument(null)
        setSelectedAttendants([])
        router.reload() // Refresh to show updated publish status
      } else {
        setError(result.error || 'Failed to publish document')
      }
    } catch (error) {
      setError('An error occurred while publishing')
    } finally {
      setLoading(false)
    }
  }

  const handleUnpublishDocument = async (documentId: string) => {
    if (!(await appConfirmMessage('Are you sure you want to unpublish this document? It will be removed from all volunteer dashboards.'))) {
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/events/${eventId}/documents/${documentId}/unpublish`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message || 'Document unpublished successfully')
        router.reload()
      } else {
        setError(result.error || 'Failed to unpublish document')
      }
    } catch (error) {
      setError('An error occurred while unpublishing')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!(await appConfirmMessage('Are you sure you want to delete this document? This action cannot be undone.'))) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/events/${eventId}/documents/${documentId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Document deleted successfully')
        router.reload()
      } else {
        setError(result.error || 'Failed to delete document')
      }
    } catch (error) {
      setError('An error occurred while deleting')
    } finally {
      setLoading(false)
    }
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

  const filteredAttendants = attendants.filter(attendant =>
    `${attendant.firstName} ${attendant.lastName} ${attendant.congregation}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  return (
    <>
      <Head>
        <title>Documents - {event?.name} | Theocratic Shift Scheduler</title>
      </Head>

      <EventPageWrapper
        event={event}
        currentPage="documents"
        canEdit={canEdit}
        canDelete={canDelete}
        canManagePermissions={canManagePermissions}
        moduleConfig={moduleConfig}
        terminology={terminology}
      >
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <p className="mt-1 text-sm text-gray-600">
                  Upload and publish documents to volunteers for {event?.name}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors"
                >
                  📤 Upload Document
                </button>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {/* Upload Form */}
          {showUploadForm && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload New Document</h3>
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      Document Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={uploadData.title}
                      onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., Emergency Procedures, Position Instructions"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                      Select File *
                    </label>
                    <input
                      type="file"
                      id="file"
                      onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.mov,.txt"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    value={uploadData.description}
                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                    placeholder="Brief description of the document content..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadForm(false)
                      setUploadData({ title: '', description: '', file: null })
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Documents List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Event Documents ({documents.length})
              </h3>
            </div>
            
            {documents.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded yet</h3>
                <p className="text-gray-600 mb-4">
                  Upload your first document to share with volunteers
                </p>
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors"
                >
                  📤 Upload Document
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {documents.map((document) => (
                  <div key={document.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="text-3xl">{getFileIcon(document.fileType)}</div>
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">{document.title}</h4>
                          {document.description && (
                            <p className="text-sm text-gray-600 mt-1">{document.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>📁 {document.fileName}</span>
                            <span>📏 {formatFileSize(document.fileSize)}</span>
                            <span>📅 {new Date(document.uploadedAt).toLocaleDateString()}</span>
                            <span>👤 {document.uploadedBy}</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            {document.publishedTo === 'all' ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                📢 Published to All Roster Volunteers
                              </span>
                            ) : document.publishedCount > 0 ? (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                📤 Published to {document.publishedCount} Volunteers
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                📝 Not Published
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {document.fileOnDisk ? (
                          <a
                            href={`/api/events/${eventId}/documents/${document.id}/file`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                          >
                            👁️ View
                          </a>
                        ) : (
                          <span
                            className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded cursor-not-allowed"
                            title="No file on server for this record — delete and upload again."
                          >
                            File missing
                          </span>
                        )}
                        {(document.publishedCount > 0 || document.publishedTo !== 'none') ? (
                          <button
                            onClick={() => handleUnpublishDocument(document.id)}
                            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition-colors"
                          >
                            📥 Unpublish
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedDocument(document)
                              setShowPublishModal(true)
                            }}
                            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
                          >
                            📤 Publish
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDocument(document.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        {/* Publish Modal */}
        {showPublishModal && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Publish Document: {selectedDocument.title}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Who should receive this document?
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="publishType"
                          value="all"
                          checked={publishType === 'all'}
                          onChange={(e) => setPublishType(e.target.value as 'all' | 'individual')}
                          className="mr-2"
                        />
                        <span>📢 All Volunteers on roster ({attendants.length} people)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="publishType"
                          value="individual"
                          checked={publishType === 'individual'}
                          onChange={(e) => setPublishType(e.target.value as 'all' | 'individual')}
                          className="mr-2"
                        />
                        <span>👤 Select Individual Volunteers</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Roster only — IVS Module people are not included unless they were also added to Volunteers.
                    </p>
                  </div>

                  {publishType === 'individual' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search and Select Volunteers
                      </label>
                      <input
                        type="text"
                        placeholder="Search by name or congregation..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3"
                      />
                      <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                        {filteredAttendants.map((attendant, index) => (
                          <label key={attendant.id} className="flex items-center p-3 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedAttendants.includes(attendant.id)}
                              onClick={(e) => publishRange.markClick(e)}
                              onChange={(e) => {
                                const ids = filteredAttendants.map((row) => row.id)
                                const handled = publishRange.consumeRange(e, index, (lo, hi) => {
                                  setSelectedAttendants((prev) => {
                                    const next = new Set(prev)
                                    ids.slice(lo, hi + 1).forEach((id) => next.add(id))
                                    return Array.from(next)
                                  })
                                })
                                if (handled) return
                                if (e.target.checked) {
                                  setSelectedAttendants([...selectedAttendants, attendant.id])
                                } else {
                                  setSelectedAttendants(selectedAttendants.filter(id => id !== attendant.id))
                                }
                              }}
                              className="mr-3"
                            />
                            <div>
                              <div className="font-medium">{attendant.firstName} {attendant.lastName}</div>
                              <div className="text-sm text-gray-600">{attendant.congregation}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                      {publishType === 'individual' && (
                        <p className="text-sm font-semibold text-blue-900 mt-2">
                          {selectedAttendants.length} volunteer{selectedAttendants.length === 1 ? '' : 's'} selected
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowPublishModal(false)
                      setSelectedDocument(null)
                      setSelectedAttendants([])
                      setSearchTerm('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublishDocument}
                    disabled={loading || (publishType === 'individual' && selectedAttendants.length === 0)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Publishing...' : 'Publish Document'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </EventPageWrapper>
    </>
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

  // CRITICAL: Block attendants from accessing admin pages
  if (session.user?.role === 'VOLUNTEER') {
    return {
      redirect: {
        destination: '/volunteer/dashboard',
        permanent: false,
      },
    }
  }

  // Only ADMIN, OVERSEER, ASSISTANT_OVERSEER, KEYMAN can access
  if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN'].includes(session.user?.role || '')) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  const { id } = context.params!
  
  try {
    const { prisma } = await import('../../../src/lib/prisma')
    
    // Fetch event
    const event = await prisma.events.findUnique({
      where: { id: id as string },
    })

    if (!event) {
      return {
        notFound: true,
      }
    }

    // Check event-specific permissions
    const { canManageEvent, canDeleteEvent, canManagePermissions } = await import('../../../src/lib/eventAccess')
    const userId = session.user?.id || ''
    const canEdit = await canManageEvent(userId, id as string)
    const canDelete = await canDeleteEvent(userId, id as string)
    const canManagePerms = await canManagePermissions(userId, id as string)

    // Fetch documents from database
    const docs = await prisma.event_documents.findMany({
      where: {
        eventId: id as string,
        isActive: true
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })
    
    const { documentFileExists } = await import('../../../src/lib/documentFileStorage')

    const documents: Document[] = docs.map(doc => ({
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      uploadedBy: doc.uploadedBy,
      uploadedAt: doc.uploadedAt.toISOString(),
      publishedTo: doc.publishedTo as 'all' | 'individual',
      publishedCount: doc.publishedCount,
      description: doc.description || undefined,
      fileOnDisk: documentFileExists(doc.fileUrl),
    }))

    // Roster only for publish picker — exclude IVS-only imports
    const { volunteerRosterWhere } = await import('../../../src/lib/volunteerRoster')
    const rosterMemberships = await prisma.event_volunteers.findMany({
      where: {
        eventId: id as string,
        isActive: true,
        volunteerId: { not: null },
        ...volunteerRosterWhere,
        volunteer: { isActive: true },
      },
      select: {
        volunteer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            congregation: true,
            email: true,
          },
        },
      },
      orderBy: [
        { volunteer: { lastName: 'asc' } },
        { volunteer: { firstName: 'asc' } },
      ],
    })

    const attendants = rosterMemberships
      .map((m) => m.volunteer)
      .filter((v): v is NonNullable<typeof v> => !!v)

    const eventModuleConfig = (event.settings as any)?.modules
      ? {
          countTimes: (event.settings as any).modules.countTimes ?? true,
          lanyards: (event.settings as any).modules.lanyards ?? true,
          ivsModule: (event.settings as any).modules.ivsModule ?? false,
          positions: (event.settings as any).modules.positions ?? true,
          documents: (event.settings as any).modules.documents ?? true,
          announcements: (event.settings as any).modules.announcements ?? true,
        }
      : null

    return {
      props: {
        eventId: id as string,
        event: {
          ...event,
          startDate: event.startDate ? event.startDate.toISOString().split('T')[0] + 'T12:00:00' : null,
          endDate: event.endDate ? event.endDate.toISOString().split('T')[0] + 'T12:00:00' : null,
        },
        documents,
        canEdit,
        canDelete,
        canManagePermissions: canManagePerms,
        attendants,
        moduleConfig: eventModuleConfig,
        terminology: (event.settings as any)?.terminology || null
      },
    }
  } catch (error) {
    console.error('Error fetching event documents:', error)
    return {
      notFound: true,
    }
  }
}
