import { useState } from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'

interface Assignment {
  id: string
  shiftStart: string
  shiftEnd: string
  status: string
  event_positions: {
    positionName: string
    department: string
    description?: string
  }
  position_shifts?: {
    shiftName: string
    startTime: string
    endTime: string
  }
}

interface AttendantData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  congregation: string
  formsOfService: string[]
  hasUserAccount: boolean
}

interface LookupResult {
  attendant: AttendantData
  assignments: Assignment[]
}

export default function GuestLookupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [eventId, setEventId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [error, setError] = useState('')

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both first and last name')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const params = new URLSearchParams({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(eventId && { eventId })
      })

      const response = await fetch(`/api/attendants/lookup?${params}`)
      const data = await response.json()

      if (data.success) {
        setResult(data.data)
      } else {
        setError(data.error || 'Attendant not found')
      }
    } catch (err) {
      setError('An error occurred while looking up your information')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Guest Attendant Lookup | Theocratic Shift Scheduler</title>
        <meta name="description" content="Look up your attendant assignments" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Attendant Lookup
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter your name to view your assignments
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLookup}>
            <div className="space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your first name"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your last name"
                />
              </div>

              <div>
                <label htmlFor="eventId" className="block text-sm font-medium text-gray-700">
                  Event ID (Optional)
                </label>
                <input
                  id="eventId"
                  name="eventId"
                  type="text"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter event ID for specific assignments"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-600">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Looking up...' : 'Look Up Assignments'}
              </button>
            </div>
          </form>

          {result && (
            <div className="mt-8 bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Welcome, {result.attendant.firstName} {result.attendant.lastName}!
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Contact Information</h4>
                  <div className="mt-1 text-sm text-gray-600">
                    <p>Email: {result.attendant.email}</p>
                    {result.attendant.phone && <p>Phone: {result.attendant.phone}</p>}
                    <p>Congregation: {result.attendant.congregation}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">Forms of Service</h4>
                  <div className="mt-1">
                    {Array.isArray(result.attendant.formsOfService) && result.attendant.formsOfService.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {result.attendant.formsOfService.map((form, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {form}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No forms of service listed</p>
                    )}
                  </div>
                </div>

                {result.assignments && result.assignments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Your Assignments</h4>
                    <div className="mt-2 space-y-2">
                      {result.assignments.map((assignment) => (
                        <div key={assignment.id} className="border border-gray-200 rounded-md p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">
                                {assignment.event_positions.positionName}
                              </p>
                              {assignment.event_positions.department && (
                                <p className="text-sm text-gray-600">
                                  Department: {assignment.event_positions.department}
                                </p>
                              )}
                              {assignment.event_positions.description && (
                                <p className="text-sm text-gray-500">
                                  {assignment.event_positions.description}
                                </p>
                              )}
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              assignment.status === 'ASSIGNED' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {assignment.status}
                            </span>
                          </div>
                          
                          <div className="mt-2 text-sm text-gray-600">
                            <p>
                              Shift: {new Date(assignment.shiftStart).toLocaleString()} - {new Date(assignment.shiftEnd).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!result.assignments || result.assignments.length === 0) && eventId && (
                  <div className="text-sm text-gray-500">
                    No assignments found for the specified event.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {}
  }
}
