// Enhanced Attendant Types for Theocratic Shift Scheduler
// Date: 2025-01-04

export interface Attendant {
  id: string
  userId?: string | null
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  congregation: string
  formsOfService: FormOfService[]
  isActive: boolean
  notes?: string | null
  
  // Legacy fields for backward compatibility
  availabilityStatus?: string | null
  isAvailable?: boolean
  servingAs?: any[] | null
  skills?: any[] | null
  preferredDepartments?: any[] | null
  unavailableDates?: any[] | null
  totalAssignments?: number
  totalHours?: number
  
  createdAt: string
  updatedAt: string
  
  // Optional user relationship
  users?: {
    id: string
    email: string
    firstName: string
    lastName: string
    phone?: string | null
    congregation?: string | null
    role: string
    isActive: boolean
  } | null
}

export interface AttendantCreateInput {
  firstName: string
  lastName: string
  email: string
  phone?: string
  congregation: string
  formsOfService: FormOfService[]
  isActive?: boolean
  notes?: string
  userId?: string // Optional link to existing user
}

export interface AttendantUpdateInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  congregation?: string
  formsOfService?: FormOfService[]
  isActive?: boolean
  notes?: string
  userId?: string
}

export interface AttendantBulkImport {
  attendants: AttendantImportRow[]
  eventId?: string // If importing for specific event
}

export interface AttendantImportRow {
  firstName: string
  lastName: string
  email: string
  phone?: string
  congregation: string
  formsOfService: string // Comma-separated values
  isActive?: boolean
  notes?: string
}

export interface AttendantSearchFilters {
  search?: string
  congregation?: string
  formsOfService?: FormOfService[]
  isActive?: boolean
  hasUser?: boolean
}

export interface AttendantStats {
  total: number
  active: number
  inactive: number
  byCongregation: Record<string, number>
  byFormsOfService: Record<FormOfService, number>
  withUsers: number
  withoutUsers: number
}

// Forms of Service enumeration
export type FormOfService = 
  | 'Elder'
  | 'Ministerial Servant'
  | 'Exemplary'
  | 'Regular Pioneer'
  | 'Other Department'

export const FORMS_OF_SERVICE: FormOfService[] = [
  'Elder',
  'Ministerial Servant',
  'Exemplary',
  'Regular Pioneer',
  'Other Department'
]

export const FORMS_OF_SERVICE_OPTIONS = FORMS_OF_SERVICE.map(form => ({
  value: form,
  label: form
}))

// Event-Attendant Association
export interface EventAttendantAssociation {
  id: string
  eventId: string
  attendantId: string
  role?: string
  isActive: boolean
  assignedDepartments?: string[]
  assignedStationRanges?: string[]
  createdAt: string
  updatedAt: string
  
  attendant: Attendant
  event: {
    id: string
    name: string
    eventType: string
    startDate: string
    endDate: string
  }
}

// API Response Types
export interface AttendantResponse {
  success: boolean
  data: Attendant
  error?: string
}

export interface AttendantsResponse {
  success: boolean
  data: {
    attendants: Attendant[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
    stats?: AttendantStats
    eventId?: string
    eventName?: string
  }
  error?: string
}

export interface AttendantBulkResponse {
  success: boolean
  data: {
    created: number
    updated: number
    errors: Array<{
      row: number
      email: string
      error: string
    }>
  }
  error?: string
}
