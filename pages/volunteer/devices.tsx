import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'

type SigninRow = {
  id: string
  label: string
  createdAt: string
  lastSeenAt: string
  current: boolean
}

function when(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function VolunteerDevicesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [rows, setRows] = useState<SigninRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/signin?role=volunteer')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    void load()
  }, [status])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/volunteer/sessions')
      const data = await response.json()
      if (!response.ok || !data.success) {
        setError(data.error || 'Could not load sign-ins')
        setRows([])
        return
      }
      setRows(data.data.signins || [])
    } catch {
      setError('Could not load sign-ins')
    } finally {
      setLoading(false)
    }
  }

  async function post(action: string, id?: string) {
    setBusy(id || action)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/volunteer/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setError(data.error || 'Could not sign that device out')
        return
      }
      if (data.data?.signedOut) {
        await signOut({ callbackUrl: '/auth/signin?role=volunteer' })
        return
      }
      setMessage(action === 'revoke-others' ? 'Other sign-ins are ended.' : 'That sign-in is ended.')
      await load()
    } catch {
      setError('Could not sign that device out')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Head>
        <title>Phones signed in | TheoShift</title>
      </Head>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link href="/volunteer/dashboard" className="text-sm text-blue-700 font-medium">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Phones signed in</h1>
          <p className="mt-2 text-gray-600 leading-6">
            If you lost a phone, sign it out here. It stops working the next time it reaches TheoShift.
            Sign out every other sign-in also ends phones that signed in before this list existed.
          </p>

          {session?.user?.role && session.user.role !== 'VOLUNTEER' ? (
            <p className="mt-6 text-gray-700">Open this page after you sign in as a volunteer.</p>
          ) : null}

          {loading ? <p className="mt-6 text-gray-600">Loading…</p> : null}
          {error ? <p className="mt-4 text-red-700">{error}</p> : null}
          {message ? <p className="mt-4 text-green-800">{message}</p> : null}

          <div className="mt-6 space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {row.label}
                    {row.current ? ' · This browser' : ''}
                  </p>
                  <p className="text-sm text-gray-600">Signed in {when(row.createdAt)} · Last used {when(row.lastSeenAt)}</p>
                </div>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => void post('revoke', row.id)}
                  className="text-sm font-semibold text-red-700 min-h-[44px] px-3"
                >
                  {busy === row.id ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            ))}
            {!loading && rows.length === 0 && session?.user?.role === 'VOLUNTEER' ? (
              <p className="text-gray-600">No phones are listed yet. Sign in again on a phone and it will show up here.</p>
            ) : null}
          </div>

          {session?.user?.role === 'VOLUNTEER' ? (
            <button
              type="button"
              disabled={busy === 'revoke-others'}
              onClick={() => void post('revoke-others')}
              className="mt-6 w-full bg-blue-600 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
            >
              {busy === 'revoke-others' ? 'Signing out…' : 'Sign out every other sign-in'}
            </button>
          ) : null}
        </div>
      </main>
    </>
  )
}
