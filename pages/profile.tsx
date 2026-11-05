import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { authOptions } from './api/auth/[...nextauth]'
import { notifyAlert, toast } from '../lib/ui/toast'
import {
  getViewAsHeaders,
  getViewAsVolunteerId
} from '@/lib/viewAsClient'

interface ProfileData {
  firstName: string
  lastName: string
  email: string
  phone: string
  congregation: string
  role: string
  hasPassword: boolean
  hasVolunteerRecord: boolean
  assignmentCount: number
  canChangePassword: boolean
  deletionMethod: 'email' | 'password'
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    congregation: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false)
  const [viewAsActive, setViewAsActive] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    ;(async () => {
      if (getViewAsVolunteerId()) {
        setViewAsActive(true)
        setLoading(false)
        return
      }
      try {
        const res = await fetch('/api/profile', {
          headers: getViewAsHeaders()
        })
        const data = await res.json()
        if (!data.success) {
          notifyAlert(data.error || 'Failed to load profile')
          return
        }
        setProfile(data.data)
        setForm((prev) => ({
          ...prev,
          firstName: data.data.firstName || '',
          lastName: data.data.lastName || '',
          email: data.data.email || '',
          phone: data.data.phone || '',
          congregation: data.data.congregation || ''
        }))
      } catch {
        notifyAlert('Failed to load profile')
      } finally {
        setLoading(false)
      }
    })()
  }, [status])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      notifyAlert('New passwords do not match')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getViewAsHeaders()
        },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          congregation: form.congregation,
          currentPassword: form.currentPassword || undefined,
          newPassword: form.newPassword || undefined
        })
      })
      const data = await res.json()
      if (!data.success) {
        notifyAlert(data.error || 'Failed to update profile')
        return
      }
      toast.success('Profile saved')
      setForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }))
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              firstName: form.firstName,
              lastName: form.lastName,
              email: form.email,
              phone: form.phone,
              congregation: form.congregation
            }
          : prev
      )
    } catch {
      notifyAlert('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirm.trim().toUpperCase() !== 'DELETE') {
      notifyAlert('Type DELETE to confirm')
      return
    }
    setDeleting(true)
    try {
      const res = await fetch('/api/profile/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getViewAsHeaders()
        },
        body: JSON.stringify({
          confirmation: 'DELETE',
          currentPassword:
            profile?.deletionMethod === 'password' ? deletePassword : undefined
        })
      })
      const data = await res.json()
      if (!data.success) {
        notifyAlert(data.error || 'Failed to delete account')
        setDeleting(false)
        return
      }
      if (data.requiresEmailConfirmation) {
        setEmailConfirmationSent(true)
        setDeleting(false)
        toast.success('Confirmation email sent')
        return
      }

      toast.success('Account deleted')
      await signOut({ redirect: false })
      window.location.href = '/auth/signin'
    } catch {
      notifyAlert('Failed to delete account')
      setDeleting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!session) return null

  if (viewAsActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md bg-white border border-amber-200 rounded-lg shadow-sm p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Profile unavailable in View As</h1>
          <p className="text-sm text-gray-600 mt-2">
            Exit Admin View As before opening, editing, or deleting an account.
          </p>
          <Link
            href="/events/select"
            className="inline-block mt-4 text-blue-600 hover:text-blue-800"
          >
            Return to Event Selection
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>My Profile | TheoShift</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your account details
                {profile?.role ? ` · ${profile.role}` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {session?.user?.role === 'VOLUNTEER' ? (
                <Link href="/volunteer/devices" className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap">
                  Phones signed in
                </Link>
              ) : null}
              <Link
                href="/events/select"
                className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
              >
                ← Events
              </Link>
            </div>
          </div>

          <form onSubmit={handleSave} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(XXX) XXX-XXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Congregation</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.congregation}
                onChange={(e) => setForm({ ...form, congregation: e.target.value })}
              />
            </div>

            {profile?.canChangePassword && (
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <h2 className="text-sm font-semibold text-gray-900">Change password</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.currentPassword}
                    onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.newPassword}
                      onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm rounded-md"
              >
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>

          <div className="mt-8 bg-white rounded-lg shadow-sm border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-800">Delete my account</h2>
            <p className="text-sm text-gray-600 mt-2">
              Permanently removes your login and personal information (name, email, phone).
              {profile?.assignmentCount
                ? ` Your ${profile.assignmentCount} position assignment${profile.assignmentCount === 1 ? '' : 's'} will also be removed so schedules stay accurate.`
                : ''}{' '}
              This cannot be undone.
            </p>

            {emailConfirmationSent ? (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">
                  Confirmation link sent
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Check your email and open the one-time link within 30 minutes.
                  Nothing is deleted until you confirm there.
                </p>
              </div>
            ) : !showDelete ? (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="mt-4 px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 text-sm rounded-md"
              >
                I want to delete my account…
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Type <span className="font-mono font-semibold">DELETE</span> to confirm
                </label>
                <input
                  className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
                {profile?.deletionMethod === 'password' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current password
                    </label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      required
                    />
                  </div>
                )}
                {profile?.deletionMethod === 'email' && (
                  <p className="text-sm text-gray-600">
                    We’ll email a one-time confirmation link to <strong>{profile.email}</strong>.
                    Your account remains active until you open that link and confirm.
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDelete(false)
                      setDeleteConfirm('')
                      setDeletePassword('')
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={
                      deleting ||
                      deleteConfirm.trim().toUpperCase() !== 'DELETE' ||
                      (profile?.deletionMethod === 'password' && !deletePassword)
                    }
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm rounded-md"
                  >
                    {deleting
                      ? 'Processing…'
                      : profile?.deletionMethod === 'email'
                        ? 'Email confirmation link'
                        : 'Permanently delete account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session) {
    return {
      redirect: { destination: '/auth/signin', permanent: false }
    }
  }
  return { props: {} }
}
