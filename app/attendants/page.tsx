'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../providers'
import Link from 'next/link'

interface Attendant {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  isAvailable: boolean
  totalAssignments: number
  totalHours: number
  servingAs: string[]
  skills: string[]
  preferredDepartments: string[]
  createdAt: string
}

export default function Attendants() {
  const { user } = useAuth()
  const [attendants, setAttendants] = useState<Attendant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (user) {
      fetchAttendants()
    }
  }, [user])

  const fetchAttendants = async () => {
    try {
      const response = await fetch('/api/attendants')
      if (response.ok) {
        const data = await response.json()
        setAttendants(data)
      }
    } catch (error) {
      console.error('Failed to fetch attendants:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async (attendantId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/attendants/${attendantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAvailable: !currentStatus }),
      })

      if (response.ok) {
        fetchAttendants()
      }
    } catch (error) {
      console.error('Failed to update attendant:', error)
    }
  }

  const filteredAttendants = attendants.filter(attendant =>
    `${attendant.firstName} ${attendant.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendant.servingAs?.some(role => role.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (!user) {
    return <div className="p-8">Please sign in to access this page.</div>
  }

  if (loading) {
    return <div className="p-8">Loading attendants...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Attendant Management</h1>
              <p className="text-gray-600 mt-2">Manage attendant profiles and availability</p>
            </div>
            <div className="space-x-4">
              <Link
                href="/dashboard"
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/attendants/create"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Add Attendant
              </Link>
            </div>
          </div>
          
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search attendants by name, email, or role..."
              className="px-4 py-2 border border-gray-300 rounded-lg w-full max-w-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900">Total Attendants</h3>
              <p className="text-2xl font-bold text-blue-700">{attendants.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900">Available</h3>
              <p className="text-2xl font-bold text-green-700">
                {attendants.filter(a => a.isAvailable).length}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900">Total Assignments</h3>
              <p className="text-2xl font-bold text-purple-700">
                {attendants.reduce((sum, a) => sum + (a.totalAssignments || 0), 0)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Contact</th>
                  <th className="px-4 py-2 text-left">Serving As</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Assignments</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendants.map((attendant) => (
                  <tr key={attendant.id} className="border-t">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">
                        {attendant.firstName} {attendant.lastName}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm text-gray-900">{attendant.email}</div>
                      <div className="text-sm text-gray-500">{attendant.phone}</div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {attendant.servingAs?.slice(0, 2).map((role, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {role}
                          </span>
                        ))}
                        {attendant.servingAs?.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{attendant.servingAs.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        attendant.isAvailable 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {attendant.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm">
                        <div>{attendant.totalAssignments || 0} assignments</div>
                        <div className="text-gray-500">{attendant.totalHours || 0} hours</div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="space-x-2">
                        <Link
                          href={`/attendants/${attendant.id}`}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => toggleAvailability(attendant.id, attendant.isAvailable)}
                          className={`text-sm ${
                            attendant.isAvailable 
                              ? 'text-red-600 hover:text-red-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {attendant.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAttendants.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No attendants found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
