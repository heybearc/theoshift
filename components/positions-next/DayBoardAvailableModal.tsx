import React from 'react'
import type { Volunteer } from './types'

type Props = {
  volunteers: Volunteer[]
  onClose: () => void
}

export default function DayBoardAvailableModal({ volunteers, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">Available volunteers</h3>
          <p className="mt-1 text-sm text-gray-600">
            Active people with no assignment and no overseer or keyman role.
          </p>
        </div>
        <div className="px-4 py-3">
          {volunteers.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-600">
              Everyone active is already assigned or serving in oversight.
            </p>
          ) : (
            <ul className="space-y-2">
              {volunteers.map((volunteer) => (
                <li
                  key={volunteer.id}
                  className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
                >
                  <span>
                    <span className="block font-medium text-gray-900">
                      {volunteer.firstName} {volunteer.lastName}
                    </span>
                    {volunteer.congregation ? (
                      <span className="block text-sm text-gray-500">
                        {volunteer.congregation}
                      </span>
                    ) : null}
                  </span>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                    Available
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 touch-manipulation"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
