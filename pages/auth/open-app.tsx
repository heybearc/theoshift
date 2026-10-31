import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

function appLink(token: string, email: string) {
  return `theoshift://auth?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
}

export default function OpenAppPage() {
  const router = useRouter()
  const token = typeof router.query.token === 'string' ? router.query.token : ''
  const email = typeof router.query.email === 'string' ? router.query.email : ''
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    if (!token || !email) return
    window.location.href = appLink(token, email)
    setOpened(true)
  }, [token, email])

  return (
    <>
      <Head>
        <title>Open TheoShift</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full">
          <h1 className="text-2xl font-semibold text-gray-900">Open TheoShift</h1>
          <p className="text-gray-600 mt-3">
            This link signs you in on the phone where the TheoShift app is installed.
          </p>
          {token && email ? (
            <a
              href={appLink(token, email)}
              className="mt-6 inline-flex items-center justify-center w-full rounded-lg bg-emerald-600 text-white font-semibold py-3"
            >
              {opened ? 'Open the app again' : 'Open the TheoShift app'}
            </a>
          ) : (
            <p className="text-sm text-amber-800 mt-4">This sign-in link is missing its token. Request a new one in the app.</p>
          )}
          <p className="text-sm text-gray-500 mt-4">
            If the app does not open, copy the address from this page and paste it into TheoShift on the sign-in screen.
          </p>
        </div>
      </div>
    </>
  )
}
