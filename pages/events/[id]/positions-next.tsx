import Head from 'next/head'
import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import EventPageWrapper from '../../../components/EventPageWrapper'
import PositionsDayBoard from '../../../components/positions-next/PositionsDayBoard'
import {
  loadPositionsPageProps,
  type PositionsPageProps,
} from '../../../lib/loadPositionsPageProps'
import {
  enumerateEventDateKeys,
  isMultiDayEvent,
} from '../../../lib/eventDates'

/**
 * Published Positions layout (day board). Classic `/positions` remains available via Use classic layout.
 */
export default function PositionsNextPage({
  eventId,
  event,
  positions,
  attendants,
  stats,
  canManageContent,
  canEdit,
  canDelete,
  canManagePermissions,
  moduleConfig,
  terminology,
}: PositionsPageProps) {
  const eventDateKeys = enumerateEventDateKeys(event.startDate, event.endDate)
  const multiDay = isMultiDayEvent(event.startDate, event.endDate)

  return (
    <EventPageWrapper
      event={{
        id: event.id,
        name: event.name,
        status: event.status,
        eventType: event.eventType,
        startDate: event.startDate || undefined,
      }}
      currentPage="positions"
      canEdit={canEdit}
      canDelete={canDelete}
      canManagePermissions={canManagePermissions}
      moduleConfig={moduleConfig}
      terminology={terminology}
    >
      <Head>
        <title>
            {event?.name ? `${event.name} - Positions` : 'Positions'} | TheoShift
        </title>
      </Head>

      <div className="min-h-screen bg-gray-50 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-indigo-950">
                  Positions day board
                </p>
                <p className="text-sm text-indigo-900">
                  Default layout for multi-day stations and per-shift overseers.
                  Classic Positions is still available if you need it.
                </p>
              </div>
              <Link
                href={`/events/${eventId}/positions`}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-100 touch-manipulation"
              >
                Use classic layout
              </Link>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stations by day</h1>
              <p className="text-sm text-gray-600">
                {stats.active} active positions · {stats.assigned} with assignments
                {multiDay ? ' · multi-day event' : ''}
              </p>
            </div>
          </div>

          <PositionsDayBoard
            eventId={eventId}
            eventName={event.name}
            eventStart={event.startDate}
            eventEnd={event.endDate}
            positions={positions}
            attendants={attendants}
            canManageContent={canManageContent}
            eventDateKeys={eventDateKeys}
          />
        </div>
      </div>
    </EventPageWrapper>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) =>
  loadPositionsPageProps(context)
