import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { prisma } from '../../src/lib/prisma'
import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

interface Attendant {
  id: string
  firstName: string
  lastName: string
  congregation: string
  phone: string | null
  email: string
  hasPin: boolean
}

interface Props {
  attendants: Attendant[]
}

export default function AttendantPINManagement({ attendants }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [generatedPins, setGeneratedPins] = useState<Record<string, string>>({})

  const handleSetPIN = async (attendantId: string, autoGenerate: boolean, customPin?: string) => {
    setLoading(attendantId)
    setMessage(null)

    try {
      const response = await fetch('/api/attendant/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendantId,
          pin: customPin,
          autoGenerate
        })
      })

      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: `PIN set successfully: ${result.pin}` })
        setGeneratedPins(prev => ({ ...prev, [attendantId]: result.pin }))
        
        // Refresh page after 2 seconds
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setMessage({ type: 'error', text: result.error })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to set PIN' })
    } finally {
      setLoading(null)
    }
  }

  const handleBulkAutoGenerate = async () => {
    const attendantsWithPhone = attendants.filter(a => a.phone && !a.hasPin)
    
    if (!confirm(`Generate PINs for ${attendantsWithPhone.length} attendants with phone numbers?`)) {
      return
    }

    for (const attendant of attendantsWithPhone) {
      await handleSetPIN(attendant.id, true)
      await new Promise(resolve => setTimeout(resolve, 500)) // Rate limit
    }
  }

  return (
    <>
      <Head>
        <title>Attendant PIN Management | Theocratic Shift Scheduler</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Attendant PIN Management</h1>
            <p className="mt-2 text-gray-600">
              Set up PIN codes for attendants to access their dashboard
            </p>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message.text}
            </div>
          )}

          {/* Bulk Actions */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Bulk Actions</h2>
            <button
              onClick={handleBulkAutoGenerate}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Auto-Generate PINs for All (Last 4 of Phone)
            </button>
            <p className="text-sm text-gray-600 mt-2">
              This will generate PINs for attendants who have phone numbers and don't have a PIN yet.
            </p>
          </div>

          {/* Attendants Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Congregation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PIN Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendants.map((attendant) => (
                  <tr key={attendant.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {attendant.firstName} {attendant.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{attendant.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {attendant.congregation}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {attendant.phone || <span className="text-red-500">No phone</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {attendant.hasPin ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          ✓ PIN Set
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          No PIN
                        </span>
                      )}
                      {generatedPins[attendant.id] && (
                        <div className="mt-1 text-sm font-mono text-blue-600">
                          PIN: {generatedPins[attendant.id]}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {attendant.phone && (
                        <button
                          onClick={() => handleSetPIN(attendant.id, true)}
                          disabled={loading === attendant.id}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          {loading === attendant.id ? 'Setting...' : 'Auto-Generate'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const pin = prompt('Enter 4-digit PIN:')
                          if (pin && /^\d{4}$/.test(pin)) {
                            handleSetPIN(attendant.id, false, pin)
                          } else if (pin) {
                            alert('PIN must be exactly 4 digits')
                          }
                        }}
                        disabled={loading === attendant.id}
                        className="text-green-600 hover:text-green-800 disabled:opacity-50"
                      >
                        Set Custom
                      </button>
                      {attendant.hasPin && (
                        <button
                          onClick={() => handleSetPIN(attendant.id, attendant.phone ? true : false)}
                          disabled={loading === attendant.id}
                          className="text-orange-600 hover:text-orange-800 disabled:opacity-50"
                        >
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">📋 Instructions</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>Auto-Generate:</strong> Uses last 4 digits of phone number as PIN</li>
              <li><strong>Set Custom:</strong> Manually enter a 4-digit PIN for attendants without phone numbers</li>
              <li><strong>Reset:</strong> Generate a new PIN (useful if attendant forgets)</li>
              <li><strong>Important:</strong> Communicate the PIN to the attendant securely</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  // Fetch all active attendants
  const attendants = await prisma.attendants.findMany({
    where: { isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      congregation: true,
      phone: true,
      email: true
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' }
    ]
  })

  // Check which attendants have PINs using raw query
  const pinsCheck = await prisma.$queryRaw<Array<{ id: string, pinHash: string | null }>>`
    SELECT id, "pinHash" FROM attendants WHERE "isActive" = true
  `

  const pinsMap = new Map(pinsCheck.map(p => [p.id, !!p.pinHash]))

  const attendantsWithPinStatus = attendants.map(a => ({
    ...a,
    hasPin: pinsMap.get(a.id) || false
  }))

  return {
    props: {
      attendants: JSON.parse(JSON.stringify(attendantsWithPinStatus))
    }
  }
}
