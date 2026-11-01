import Head from 'next/head'

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy — TheoShift</title>
      </Head>
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <p className="text-sm font-semibold text-blue-800">TheoShift</p>
          <h1 className="text-3xl font-semibold mt-2">Privacy</h1>
          <p className="mt-4 text-gray-700 leading-7">
            TheoShift keeps the volunteer record your congregation already has: your name, email, phone,
            assignments, availability, documents shared with you, and attendance counts you submit.
          </p>
          <h2 className="text-xl font-semibold mt-8">What the phone app stores</h2>
          <p className="mt-3 text-gray-700 leading-7">
            The app stores a sign-in token on this phone so you stay signed in. It does not sell your information,
            and it does not use advertising trackers.
          </p>
          <h2 className="text-xl font-semibold mt-8">Removing your record</h2>
          <p className="mt-3 text-gray-700 leading-7">
            Signing out removes the sign-in on that phone. Your volunteer record is kept by the event. Ask an
            overseer if you want that record changed or removed.
          </p>
          <p className="mt-8 text-sm text-gray-500">This page applies to the TheoShift website and the TheoShift phone app.</p>
        </div>
      </main>
    </>
  )
}
