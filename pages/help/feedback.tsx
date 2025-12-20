import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import { useState } from 'react'

interface FeedbackPageProps {
  userRole: string
  userName: string
  userEmail: string
}

export default function FeedbackPage({ userRole, userName, userEmail }: FeedbackPageProps) {
  const [feedbackType, setFeedbackType] = useState('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`)
        return false
      }
      // Allow common file types
      const allowedTypes = ['image/', 'text/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument']
      if (!allowedTypes.some(type => file.type.startsWith(type))) {
        alert(`File ${file.name} is not a supported file type.`)
        return false
      }
      return true
    })
    setAttachments(prev => [...prev, ...validFiles])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create FormData for file uploads
      const formData = new FormData()
      formData.append('type', feedbackType)
      formData.append('title', title)
      formData.append('description', description)
      formData.append('priority', priority)
      
      // Add files to FormData
      attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file)
      })

      const response = await fetch('/api/feedback/submit-with-files', {
        method: 'POST',
        body: formData // Don't set Content-Type header for FormData
      })

      const data = await response.json()

      if (data.success) {
        setSubmitted(true)
      } else {
        console.error('Failed to submit feedback:', data.error)
        // You could set an error state here to show to the user
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      // You could set an error state here to show to the user
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <HelpLayout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-900 mb-4">Feedback Submitted!</h1>
            <p className="text-green-700 mb-6">
              Thank you for your feedback. Your input helps us improve Theocratic Shift Scheduler.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => {
                  setSubmitted(false)
                  setTitle('')
                  setDescription('')
                  setFeedbackType('bug')
                  setPriority('medium')
                  setAttachments([])
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Submit Another
              </button>
              <a
                href="/help"
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors inline-block"
              >
                Back to Help
              </a>
            </div>
          </div>
        </div>
      </HelpLayout>
    )
  }

  return (
    <HelpLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">💡 Send Feedback</h1>
          <p className="text-gray-600">
            Help us improve Theocratic Shift Scheduler by reporting bugs, suggesting enhancements, or requesting new features.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Feedback Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'bug', label: '🐛 Bug Report', desc: 'Something is broken or not working correctly' },
                  { value: 'enhancement', label: '⚡ Enhancement', desc: 'Improve an existing feature' },
                  { value: 'feature', label: '✨ New Feature', desc: 'Request a completely new feature' }
                ].map((type) => (
                  <label key={type.value} className="relative">
                    <input
                      type="radio"
                      name="feedbackType"
                      value={type.value}
                      checked={feedbackType === type.value}
                      onChange={(e) => setFeedbackType(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      feedbackType === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="font-medium text-gray-900 mb-1">{type.label}</div>
                      <div className="text-sm text-gray-600">{type.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief summary of your feedback"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                required
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={
                  feedbackType === 'bug' 
                    ? "Please describe the bug, steps to reproduce it, and what you expected to happen..."
                    : feedbackType === 'enhancement'
                    ? "Please describe the current behavior and how you'd like it to be improved..."
                    : "Please describe the new feature you'd like to see and how it would help you..."
                }
              />
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low - Nice to have</option>
                <option value="medium">Medium - Would be helpful</option>
                <option value="high">High - Important for my work</option>
                <option value="urgent">Urgent - Blocking my work</option>
              </select>
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments (Optional)
              </label>
              <div className="space-y-3">
                {/* File Upload */}
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> screenshots or documents
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF, DOC (MAX. 10MB each)</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Attached Files List */}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Attached Files:</p>
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-white border rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">
                            {file.type.startsWith('image/') ? '🖼️' : 
                             file.type.includes('pdf') ? '📄' : 
                             file.type.includes('doc') ? '📝' : '📎'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* User Info Display */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Your Information</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Name:</strong> {userName}</p>
                <p><strong>Email:</strong> {userEmail}</p>
                <p><strong>Role:</strong> {userRole}</p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <a
                href="/help"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </a>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </div>

        {/* Note */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Your feedback is currently logged to the console for development purposes. 
            In production, this would be sent to the development team or saved to a feedback system.
          </p>
        </div>
      </div>
    </HelpLayout>
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

  return {
    props: {
      userRole: session.user?.role || 'ATTENDANT',
      userName: session.user?.name || 'Unknown User',
      userEmail: session.user?.email || 'unknown@example.com',
    },
  }
}
