'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../providers'
import Link from 'next/link'

export default function CreateAttendant() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    servingAs: [] as string[],
    skills: [] as string[],
    preferredDepartments: [] as string[],
    notes: ''
  })

  const servingAsOptions = [
    'Attendant', 'Microphone Handler', 'Sound Operator', 'Platform Assistant',
    'Literature Servant', 'Accounts Servant', 'Security', 'Parking Attendant',
    'Information Desk', 'First Aid', 'Cleaning', 'Stage Manager'
  ]

  const skillOptions = [
    'Audio/Visual Equipment', 'Public Speaking', 'First Aid Certified',
    'Sign Language', 'Multiple Languages', 'Technical Support',
    'Event Coordination', 'Customer Service', 'Security Training'
  ]

  const departmentOptions = [
    'Platform', 'Audio/Visual', 'Literature', 'Accounts', 'Security',
    'Parking', 'Information', 'First Aid', 'Cleaning', 'Stage'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/attendants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push('/attendants')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create attendant')
      }
    } catch (error) {
      setError('An error occurred while creating the attendant')
    } finally {
      setLoading(false)
    }
  }

  const handleArrayChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
    }))
  }

  if (!user) {
    return <div>Please sign in to access this page.</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Create New Attendant</h1>
            <Link
              href="/attendants"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Attendants
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serving As
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {servingAsOptions.map((option) => (
                  <label key={option} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.servingAs.includes(option)}
                      onChange={(e) => handleArrayChange('servingAs', option, e.target.checked)}
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills & Qualifications
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {skillOptions.map((skill) => (
                  <label key={skill} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.skills.includes(skill)}
                      onChange={(e) => handleArrayChange('skills', skill, e.target.checked)}
                    />
                    <span className="text-sm">{skill}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Departments
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {departmentOptions.map((dept) => (
                  <label key={dept} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.preferredDepartments.includes(dept)}
                      onChange={(e) => handleArrayChange('preferredDepartments', dept, e.target.checked)}
                    />
                    <span className="text-sm">{dept}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about the attendant..."
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link
                href="/attendants"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Attendant'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
