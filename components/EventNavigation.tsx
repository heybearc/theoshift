import Link from 'next/link'
import { useModuleConfig, useTerminology } from '../contexts/TemplateContext'
import { eventPositionsHref } from '../lib/eventPositionsHref'

interface EventNavigationProps {
  eventId: string
  canEdit?: boolean
  canDelete?: boolean
  onStatusChange?: (status: string) => void
  onDelete?: () => void
  onClone?: () => void
  onExport?: () => void
  currentStatus?: string
}

export default function EventNavigation({
  eventId,
  canEdit = false,
  canDelete = false,
  onStatusChange,
  onDelete,
  onClone,
  onExport,
  currentStatus
}: EventNavigationProps) {
  const moduleConfig = useModuleConfig()
  const terminology = useTerminology()

  const isCountTimesEnabled = moduleConfig?.countTimes !== false
  const isLanyardsEnabled = moduleConfig?.lanyards !== false
  const isPositionsEnabled = moduleConfig?.positions !== false

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center mr-3">
          <span className="text-xl">⚡</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
      </div>
      
      <div className="space-y-3">
        {/* Status Change Actions */}
        {currentStatus === 'UPCOMING' && onStatusChange && (
          <button
            onClick={() => onStatusChange('CURRENT')}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            🚀 Start Event
          </button>
        )}
        {currentStatus === 'CURRENT' && onStatusChange && (
          <button
            onClick={() => onStatusChange('COMPLETED')}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            ✅ Complete Event
          </button>
        )}
        
        {/* Core Workflow Actions - Always show Positions */}
        {isPositionsEnabled && (
          <Link
            href={eventPositionsHref(eventId)}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            📋 Manage {terminology.position}s
          </Link>
        )}
        
        <Link
          href={`/events/${eventId}/volunteers`}
          className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          👥 View {terminology.volunteer}s
        </Link>
        
        <Link
          href={`/events/${eventId}/oversight`}
          className="w-full flex items-center justify-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          🔍 Oversight Dashboard
        </Link>
        
        {/* Conditional Module Actions */}
        {isCountTimesEnabled && (
          <Link
            href={`/events/${eventId}/count-times`}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            📊 Count Times
          </Link>
        )}
        
        {isLanyardsEnabled && (
          <Link
            href={`/events/${eventId}/lanyards`}
            className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            🏷️ Lanyards
          </Link>
        )}
        
        {/* Standard Actions */}
        <Link
          href={`/events/${eventId}/documents`}
          className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          📄 Documents
        </Link>
        
        {onClone && (
          <button
            onClick={onClone}
            className="w-full flex items-center justify-center px-4 py-2 border border-blue-300 bg-blue-50 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            📋 Clone Event
          </button>
        )}
        
        {onExport && (
          <button
            onClick={onExport}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            📄 Generate Reports
          </button>
        )}
        
        {canEdit && (
          <Link
            href={`/events/${eventId}/edit`}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ⚙️ Event Settings
          </Link>
        )}
        
        <Link
          href={`/events/${eventId}/permissions`}
          className="w-full flex items-center justify-center px-4 py-2 border border-purple-300 bg-purple-50 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
        >
          🔐 Manage Permissions
        </Link>
        
        {/* Archive Action (only for completed events) */}
        {currentStatus === 'COMPLETED' && canEdit && onStatusChange && (
          <button
            onClick={() => onStatusChange('ARCHIVED')}
            className="w-full flex items-center justify-center px-4 py-2 border border-yellow-300 bg-yellow-50 rounded-md text-sm font-medium text-yellow-700 hover:bg-yellow-100 transition-colors"
          >
            📦 Archive Event
          </button>
        )}
        
        {/* Delete Action (only for event owners) */}
        {canDelete && onDelete && (
          <button
            onClick={onDelete}
            className="w-full flex items-center justify-center px-4 py-2 border border-red-300 bg-red-50 rounded-md text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            🗑️ Delete Event
          </button>
        )}
      </div>
    </div>
  )
}
