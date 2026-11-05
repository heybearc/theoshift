import { useEffect, useState, type FormEvent } from 'react'
import AdminLayout from '../../components/AdminLayout'

type ReviewState = {
  email: string
  code: string
  assignmentCount: number
  configured: boolean
  instructions: string
}

const empty: ReviewState = {
  email: '',
  code: '',
  assignmentCount: 0,
  configured: false,
  instructions: '',
}

export default function ReviewSignInPage() {
  const [form, setForm] = useState({ email: '', code: '' })
  const [saved, setSaved] = useState<ReviewState>(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/review-signin')
      const data = await response.json()
      if (!response.ok || !data.success) {
        setError(data.error || 'Could not load the review sign-in')
        return
      }
      setSaved(data.data)
      setForm({ email: data.data.email || '', code: data.data.code || '' })
    } catch {
      setError('Could not load the review sign-in')
    } finally {
      setLoading(false)
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setCopied(false)
    try {
      const response = await fetch('/api/admin/review-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setError(data.error || 'Could not save')
        return
      }
      setSaved(data.data)
      setForm({ email: data.data.email, code: data.data.code })
    } catch {
      setError('Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function copyNotes() {
    await navigator.clipboard.writeText(saved.instructions)
    setCopied(true)
  }

  return (
    <AdminLayout title="Store review sign-in" breadcrumbs={[{ label: 'Store review sign-in' }]}>
      <div className="max-w-2xl">
        <p className="text-gray-700 leading-7">
          Apple and Google sign in with an email and a sign-in code. They do not open the email link.
          Use a volunteer who already has an assignment so the app is not empty.
        </p>

        {loading ? <p className="mt-6 text-gray-600">Loading…</p> : null}
        {error ? <p className="mt-4 text-red-700">{error}</p> : null}

        <form onSubmit={(event) => void save(event)} className="mt-6 bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <label htmlFor="review-email" className="block text-sm font-semibold text-gray-700 mb-1">
              Volunteer email
            </label>
            <input
              id="review-email"
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="review-code" className="block text-sm font-semibold text-gray-700 mb-1">
              Sign-in code
            </label>
            <input
              id="review-code"
              type="text"
              required
              minLength={10}
              autoComplete="off"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="mt-1 text-sm text-gray-500">At least 10 characters. This is the password you paste into both stores.</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save review sign-in'}
          </button>
        </form>

        {saved.configured ? (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
            {saved.assignmentCount === 0 ? (
              <p className="mb-4 text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
                This volunteer has no assignment yet. Add one before you submit the app.
              </p>
            ) : (
              <p className="mb-4 text-green-800">This volunteer has {saved.assignmentCount} assignment{saved.assignmentCount === 1 ? '' : 's'}.</p>
            )}
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="font-semibold text-gray-900">Paste this into the store review forms</h2>
              <button type="button" onClick={() => void copyNotes()} className="text-sm text-blue-700 font-semibold">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-md p-3">{saved.instructions}</pre>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  )
}
