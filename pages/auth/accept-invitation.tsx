import { GetServerSideProps } from 'next'
import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { prisma } from '../../src/lib/prisma'
import { format, parseISO } from 'date-fns'

interface AcceptInvitationProps {
  invitation: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
    invitedByUser?: {
      firstName: string
      lastName: string
      email: string
    } | null
    inviteExpiry: string | null
    message?: string
  } | null
  error?: string
}

export default function AcceptInvitation({ invitation, error }: AcceptInvitationProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [formError, setFormError] = useState('')

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-500 text-4xl">❌</div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Invalid Invitation
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error || 'This invitation link is invalid or has expired.'}
            </p>
            <div className="mt-6">
              <Link href="/auth/signin" className="text-indigo-600 hover:text-indigo-500">
                Return to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: router.query.token,
          password: formData.password
        })
      })

      const result = await response.json()

      if (result.success) {
        router.push('/auth/signin?message=Account created successfully. Please sign in.')
      } else {
        setFormError(result.error || 'Failed to accept invitation')
      }
    } catch (error) {
      setFormError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isExpired = invitation.inviteExpiry ? new Date(invitation.inviteExpiry) < new Date() : false

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-yellow-500 text-4xl">⏰</div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Invitation Expired
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This invitation expired on {invitation.inviteExpiry ? format(parseISO(invitation.inviteExpiry), 'MMMM d, yyyy') : 'an unknown date'}.
              Please contact your administrator for a new invitation.
            </p>
            <div className="mt-6">
              <Link href="/auth/signin" className="text-indigo-600 hover:text-indigo-500">
                Return to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 text-green-500 text-4xl text-center">🎉</div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to JW Attendant Scheduler
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Complete your account setup
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Invitation Details</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Name:</strong> {invitation.firstName} {invitation.lastName}</p>
              <p><strong>Email:</strong> {invitation.email}</p>
              <p><strong>Role:</strong> {invitation.role}</p>
              {invitation.invitedByUser && (
                <p><strong>Invited by:</strong> {invitation.invitedByUser.firstName} {invitation.invitedByUser.lastName}</p>
              )}
              {invitation.message && (
                <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400">
                  <p className="text-blue-700 italic">"{invitation.message}"</p>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Create Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>

            {formError && (
              <div className="text-red-600 text-sm">{formError}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Accept Invitation & Create Account'}
              </button>
            </div>
          </form>

          <div className="mt-4 text-xs text-gray-500 text-center">
            Expires: {invitation.inviteExpiry ? format(parseISO(invitation.inviteExpiry), 'MMMM d, yyyy') : 'No expiration'}
          </div>
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { token } = context.query

  if (!token || typeof token !== 'string') {
    return {
      props: {
        invitation: null,
        error: 'Invalid invitation token'
      }
    }
  }

  try {
    const invitation = await prisma.users.findFirst({
      where: {
        inviteToken: token
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        inviteToken: true,
        inviteExpiry: true
      }
    })

    if (!invitation) {
      return {
        props: {
          invitation: null,
          error: 'Invitation not found or already used'
        }
      }
    }

    return {
      props: {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          role: invitation.role,
          inviteToken: invitation.inviteToken,
          inviteExpiry: invitation.inviteExpiry?.toISOString() || null
        }
      }
    }
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return {
      props: {
        invitation: null,
        error: 'Failed to load invitation'
      }
    }
  }
}
