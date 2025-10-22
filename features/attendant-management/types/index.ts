// Re-export attendant types for feature isolation
export * from '../../../src/types/attendant'

// Feature-specific types
export interface AttendantTableProps {
  attendants: Attendant[]
  loading?: boolean
  onEdit?: (attendant: Attendant) => void
  onDelete?: (attendantId: string) => void
  onSelect?: (attendantIds: string[]) => void
  selectedIds?: string[]
  onBulkStatusChange?: (attendantIds: string[], isActive: boolean) => Promise<void>
}

export interface AttendantFiltersProps {
  filters: AttendantSearchFilters
  onFiltersChange: (filters: AttendantSearchFilters) => void
  congregations: string[]
  loading?: boolean
}

export interface AttendantModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (attendant: AttendantCreateInput) => Promise<void>
  attendant?: Attendant | null
  loading?: boolean
}

export interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (data: AttendantBulkImport) => Promise<void>
  eventId?: string
  loading?: boolean
}

// Import from main types
import { Attendant, AttendantCreateInput, AttendantSearchFilters, AttendantBulkImport } from '../../../src/types/attendant'
