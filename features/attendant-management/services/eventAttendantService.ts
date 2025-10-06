// APEX GUARDIAN Event-Specific Attendant Service Layer
// Industry best practice: Event-scoped data management

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

class EventAttendantService {
  private getBaseUrl(eventId: string) {
    return `/api/events/${eventId}/attendants`
  }

  async getEventAttendants(eventId: string, filters?: AttendantSearchFilters & { 
    page?: number 
    limit?: number 
    includeStats?: boolean 
  }): Promise<AttendantsResponse> {
    const params = new URLSearchParams()
    
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.search) params.append('search', filters.search)
    if (filters?.congregation) params.append('congregation', filters.congregation)
    if (filters?.formsOfService?.length) {
      params.append('formsOfService', filters.formsOfService.join(','))
    }
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString())
    if (filters?.hasUser !== undefined) params.append('hasUser', filters.hasUser.toString())
    if (filters?.includeStats) params.append('includeStats', 'true')

    const response = await fetch(`${this.getBaseUrl(eventId)}?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch event attendants: ${response.statusText}`)
    }
    return response.json()
  }

  async getEventAttendant(eventId: string, attendantId: string): Promise<AttendantResponse> {
    const response = await fetch(`${this.getBaseUrl(eventId)}/${attendantId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch event attendant: ${response.statusText}`)
    }
    return response.json()
  }

  async createEventAttendant(eventId: string, data: AttendantCreateInput): Promise<AttendantResponse> {
    const response = await fetch(this.getBaseUrl(eventId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to create event attendant (${response.status}: ${response.statusText})`)
    }
    return response.json()
  }

  async updateEventAttendant(eventId: string, attendantId: string, data: AttendantUpdateInput): Promise<AttendantResponse> {
    const response = await fetch(`${this.getBaseUrl(eventId)}/${attendantId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to update event attendant (${response.status}: ${response.statusText})`)
    }
    return response.json()
  }

  async deleteEventAttendant(eventId: string, attendantId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.getBaseUrl(eventId)}/${attendantId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to delete event attendant (${response.status}: ${response.statusText})`)
    }
    return response.json()
  }

  async bulkImportEventAttendants(eventId: string, data: AttendantBulkImport): Promise<AttendantBulkResponse> {
    const response = await fetch(this.getBaseUrl(eventId), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('Bulk import error:', error)
      throw new Error(error.error || `Failed to import event attendants (${response.status}: ${response.statusText})`)
    }
    return response.json()
  }

  // Bulk operations for event-specific attendants
  async bulkUpdateEventAttendantStatus(eventId: string, attendantIds: string[], isActive: boolean): Promise<{ success: boolean }> {
    const updatePromises = attendantIds.map(id => 
      this.updateEventAttendant(eventId, id, { isActive })
    )
    
    try {
      await Promise.all(updatePromises)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to bulk update attendant status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async bulkDeleteEventAttendants(eventId: string, attendantIds: string[]): Promise<{ success: boolean }> {
    const deletePromises = attendantIds.map(id => 
      this.deleteEventAttendant(eventId, id)
    )
    
    try {
      await Promise.all(deletePromises)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to bulk delete attendants: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const eventAttendantService = new EventAttendantService()
export default eventAttendantService
