// Attendant Service Layer - API abstraction
import { 
  Attendant, 
  AttendantCreateInput, 
  AttendantUpdateInput,
  AttendantSearchFilters,
  AttendantBulkImport,
  AttendantsResponse,
  AttendantResponse,
  AttendantBulkResponse
} from '../types'

class AttendantService {
  private baseUrl = '/api/attendants'

  async getAttendants(filters: AttendantSearchFilters & { 
    page?: number 
    limit?: number 
    includeStats?: boolean 
  }): Promise<AttendantsResponse> {
    const params = new URLSearchParams()
    
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.search) params.append('search', filters.search)
    if (filters.congregation) params.append('congregation', filters.congregation)
    if (filters.formsOfService?.length) {
      params.append('formsOfService', filters.formsOfService.join(','))
    }
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString())
    if (filters.hasUser !== undefined) params.append('hasUser', filters.hasUser.toString())
    if (filters.includeStats) params.append('includeStats', 'true')

    const response = await fetch(`${this.baseUrl}?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch attendants: ${response.statusText}`)
    }
    return response.json()
  }

  async getAttendant(id: string): Promise<AttendantResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch attendant: ${response.statusText}`)
    }
    return response.json()
  }

  async createAttendant(data: AttendantCreateInput): Promise<AttendantResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create attendant')
    }
    return response.json()
  }

  async updateAttendant(id: string, data: AttendantUpdateInput): Promise<AttendantResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update attendant')
    }
    return response.json()
  }

  async deleteAttendant(id: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete attendant')
    }
    return response.json()
  }

  async bulkImport(data: AttendantBulkImport): Promise<AttendantBulkResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('Bulk import error:', error)
      throw new Error(error.error || `Failed to import attendants (${response.status}: ${response.statusText})`)
    }
    return response.json()
  }

  async getEventAttendants(eventId: string, filters?: AttendantSearchFilters): Promise<AttendantsResponse> {
    const params = new URLSearchParams({ eventId })
    
    if (filters?.search) params.append('search', filters.search)
    if (filters?.congregation) params.append('congregation', filters.congregation)
    if (filters?.formsOfService?.length) {
      params.append('formsOfService', filters.formsOfService.join(','))
    }
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString())

    const response = await fetch(`${this.baseUrl}?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch event attendants: ${response.statusText}`)
    }
    return response.json()
  }

  async addAttendantToEvent(eventId: string, attendantId: string): Promise<{ success: boolean }> {
    const response = await fetch(`/api/event-attendants/${eventId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attendantIds: [attendantId] }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add attendant to event')
    }
    return response.json()
  }

  async removeAttendantFromEvent(eventId: string, attendantId: string): Promise<{ success: boolean }> {
    const response = await fetch(`/api/event-attendants/${eventId}/${attendantId}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to remove attendant from event')
    }
    return response.json()
  }
}

// Export singleton instance
export const attendantService = new AttendantService()
export default attendantService
