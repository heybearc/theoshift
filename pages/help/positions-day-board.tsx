import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import Link from 'next/link'
import { useRouter } from 'next/router'

/**
 * Positions day-board layout (default Positions tab)
 */
export default function PositionsDayBoardHelp() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Positions day board
              </h1>
            </div>
            <Link href="/help" className="text-blue-600 hover:text-blue-800">
              Help Center
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8 rounded-lg bg-white p-8 shadow-sm">
          <section>
            <h2 className="mb-4 text-xl font-bold text-gray-900">Overview</h2>
            <p className="leading-relaxed text-gray-700">
              Positions organizes stations by event day. You can assign
              volunteers, set overseers, edit shift times, and run setup tools
              from the day board. Classic Positions remains available from{' '}
              <strong> Use classic layout</strong> if you need the older list/grid.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-gray-900">How to open it</h2>
            <ol className="list-decimal space-y-2 pl-5 text-gray-700">
              <li>Open an event and go to <strong>Positions</strong> (day board is the default).</li>
              <li>
                Use day tabs (or the coverage chips above them on multi-day
                events) to switch days.
              </li>
              <li>
                Choose <strong>Use classic layout</strong> only if you need the
                older Positions page.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              What you will see
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-gray-700">
              <li>
                Stations grouped for the selected day, with fill counts on each
                header.
              </li>
              <li>
                Filled stations start collapsed so underfilled work stands out.
                Tap a header to expand, or use <strong>Expand all</strong> /
                <strong> Collapse filled</strong>.
              </li>
              <li>
                On phones, admin tools live under a single{' '}
                <strong>Actions…</strong> menu.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-gray-900">Common tasks</h2>
            <ul className="list-disc space-y-2 pl-5 text-gray-700">
              <li>
                <strong>Assign</strong> someone to a shift; conflicts are flagged
                before you confirm.
              </li>
              <li>
                Set <strong>shift</strong> overseer/keyman from More…, or station
                oversight from the station header.
              </li>
              <li>
                <strong>Auto-assign</strong> fills open slots for the{' '}
                <em>active day only</em>.
              </li>
              <li>
                Setup: <strong>Bulk create</strong> and{' '}
                <strong>Apply template</strong> add stations/shifts without the
                old multi-select toolbar.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-gray-900">FAQ</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <p className="font-medium text-gray-900">
                  Where did Clear All Shifts go?
                </p>
                <p>
                  Destructive whole-event clears stay on classic Positions for
                  now.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Can I compare Friday and Saturday side by side?
                </p>
                <p>
                  Not as two full boards. Use the coverage chips above the day
                  tabs to jump between days.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session) {
    return {
      redirect: { destination: '/auth/signin', permanent: false },
    }
  }
  return { props: {} }
}
