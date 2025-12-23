// Phase 3: Template-driven department configuration types

export interface CustomField {
  id: string
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'textarea'
  required: boolean
  options?: string[] // for select/multiselect
  placeholder?: string
  helpText?: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

export interface ModuleConfig {
  countTimes: boolean
  lanyards: boolean
  positions: boolean
  customFields: CustomField[]
}

export interface Terminology {
  volunteer?: string
  position?: string
  shift?: string
  assignment?: string
  department?: string
}

export interface PositionTemplate {
  id: string
  name: string
  description?: string
  capacity?: number
  sortOrder: number
  shiftPattern?: {
    duration: number // minutes
    rotationCount: number
  }
}

export interface DepartmentTemplateConfig {
  moduleConfig?: ModuleConfig
  terminology?: Terminology
  positionTemplates?: PositionTemplate[]
}

// Default configurations for common departments
export const DEFAULT_ATTENDANTS_CONFIG: DepartmentTemplateConfig = {
  moduleConfig: {
    countTimes: true,
    lanyards: true,
    positions: true,
    customFields: [
      {
        id: 'badge_number',
        name: 'badgeNumber',
        label: 'Badge Number',
        type: 'text',
        required: false,
        placeholder: 'e.g., A-123'
      },
      {
        id: 'section_assignment',
        name: 'sectionAssignment',
        label: 'Section Assignment',
        type: 'select',
        required: false,
        options: ['Main Entrance', 'Upper Level', 'Lower Level', 'Stage Area']
      }
    ]
  },
  terminology: {
    volunteer: 'Attendant',
    position: 'Post',
    shift: 'Rotation',
    assignment: 'Assignment'
  },
  positionTemplates: [
    { id: '1', name: 'Main Entrance', sortOrder: 1, capacity: 2 },
    { id: '2', name: 'Upper Level', sortOrder: 2, capacity: 2 },
    { id: '3', name: 'Lower Level', sortOrder: 3, capacity: 2 },
    { id: '4', name: 'Stage Area', sortOrder: 4, capacity: 1 },
    { id: '5', name: 'Contribution Boxes', sortOrder: 5, capacity: 2 }
  ]
}

export const DEFAULT_BAPTISM_CONFIG: DepartmentTemplateConfig = {
  moduleConfig: {
    countTimes: false,
    lanyards: false,
    positions: true,
    customFields: [
      {
        id: 'candidate_name',
        name: 'candidateName',
        label: 'Candidate Name',
        type: 'text',
        required: false
      },
      {
        id: 'interview_date',
        name: 'interviewDate',
        label: 'Interview Date',
        type: 'date',
        required: false
      },
      {
        id: 'baptism_date',
        name: 'baptismDate',
        label: 'Baptism Date',
        type: 'date',
        required: false
      }
    ]
  },
  terminology: {
    volunteer: 'Baptism Assistant',
    position: 'Role',
    shift: 'Time Slot',
    assignment: 'Assignment'
  },
  positionTemplates: [
    { id: '1', name: 'Baptism Speaker', sortOrder: 1, capacity: 1 },
    { id: '2', name: 'Pool Assistant', sortOrder: 2, capacity: 2 },
    { id: '3', name: 'Changing Room Attendant', sortOrder: 3, capacity: 2 },
    { id: '4', name: 'Coordinator', sortOrder: 4, capacity: 1 }
  ]
}

export const DEFAULT_PARKING_CONFIG: DepartmentTemplateConfig = {
  moduleConfig: {
    countTimes: false,
    lanyards: false,
    positions: true,
    customFields: [
      {
        id: 'lot_assignment',
        name: 'lotAssignment',
        label: 'Lot Assignment',
        type: 'select',
        required: false,
        options: ['Lot A', 'Lot B', 'Lot C', 'Overflow']
      },
      {
        id: 'vehicle_count',
        name: 'vehicleCount',
        label: 'Vehicle Count',
        type: 'number',
        required: false
      }
    ]
  },
  terminology: {
    volunteer: 'Parking Attendant',
    position: 'Station',
    shift: 'Shift',
    assignment: 'Assignment'
  },
  positionTemplates: [
    { id: '1', name: 'Lot A Attendant', sortOrder: 1, capacity: 2 },
    { id: '2', name: 'Lot B Attendant', sortOrder: 2, capacity: 2 },
    { id: '3', name: 'Traffic Director', sortOrder: 3, capacity: 1 },
    { id: '4', name: 'Overflow Coordinator', sortOrder: 4, capacity: 1 }
  ]
}
