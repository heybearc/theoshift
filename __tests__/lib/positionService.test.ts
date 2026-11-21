/**
 * Unit tests for PositionService
 * Tests the extracted position API service layer
 */

import { PositionService, createPositionService } from '../../lib/positionService'

describe('PositionService', () => {
  const mockEventId = 'event-123'
  let service: PositionService

  beforeEach(() => {
    service = new PositionService(mockEventId)
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should create service with eventId', () => {
      expect(service).toBeInstanceOf(PositionService)
    })

    it('should create service via factory function', () => {
      const factoryService = createPositionService(mockEventId)
      expect(factoryService).toBeInstanceOf(PositionService)
    })
  })

  describe('deletePosition()', () => {
    it('should delete position successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const result = await service.deletePosition('pos-123')

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/positions/pos-123`,
        { method: 'DELETE' }
      )
      expect(result).toBe(true)
    })

    it('should return false on failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false })

      const result = await service.deletePosition('pos-123')

      expect(result).toBe(false)
    })
  })

  describe('hardDeletePosition()', () => {
    it('should hard delete position successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      })

      const result = await service.hardDeletePosition('pos-123')

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/positions/pos-123?hardDelete=true`,
        { method: 'DELETE' }
      )
      expect(result.success).toBe(true)
    })

    it('should return error on failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Failed' })
      })

      const result = await service.hardDeletePosition('pos-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed')
    })
  })

  describe('updatePosition()', () => {
    it('should update position successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const result = await service.updatePosition('pos-123', {
        name: 'Updated Position',
        isActive: true
      })

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/positions/pos-123`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated Position', isActive: true })
        }
      )
      expect(result).toBe(true)
    })

    it('should return false on failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false })

      const result = await service.updatePosition('pos-123', { isActive: false })

      expect(result).toBe(false)
    })
  })

  describe('createShift()', () => {
    it('should create shift successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const shiftData = {
        name: 'Morning Shift',
        startTime: '09:00',
        endTime: '12:00',
        isAllDay: false
      }

      const result = await service.createShift('pos-123', shiftData)

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/positions/pos-123/shifts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shiftData)
        }
      )
      expect(result).toBe(true)
    })
  })

  describe('deleteShift()', () => {
    it('should delete shift successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const result = await service.deleteShift('pos-123', 'shift-456')

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/positions/pos-123/shifts/shift-456`,
        { method: 'DELETE' }
      )
      expect(result).toBe(true)
    })
  })

  describe('assignOversight()', () => {
    it('should assign oversight successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const result = await service.assignOversight('pos-123', {
        overseerId: 'overseer-1',
        keymanId: 'keyman-1'
      })

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/positions/pos-123/position-oversight`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ overseerId: 'overseer-1', keymanId: 'keyman-1' })
        }
      )
      expect(result).toBe(true)
    })
  })

  describe('bulkAssignOversight()', () => {
    it('should bulk assign oversight successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const result = await service.bulkAssignOversight({
        positionIds: ['pos-1', 'pos-2'],
        overseerId: 'overseer-1'
      })

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/positions/bulk-oversight`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positionIds: ['pos-1', 'pos-2'],
            overseerId: 'overseer-1'
          })
        }
      )
      expect(result).toBe(true)
    })
  })

  describe('applyShiftTemplate()', () => {
    it('should apply shift template successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const result = await service.applyShiftTemplate({
        positionIds: ['pos-1', 'pos-2'],
        shiftTemplateId: 'template-1'
      })

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/positions/apply-shift-template`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positionIds: ['pos-1', 'pos-2'],
            shiftTemplateId: 'template-1'
          })
        }
      )
      expect(result).toBe(true)
    })
  })

  describe('bulkUpdatePositions()', () => {
    it('should update multiple positions successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const result = await service.bulkUpdatePositions(
        ['pos-1', 'pos-2', 'pos-3'],
        { isActive: true }
      )

      expect(global.fetch).toHaveBeenCalledTimes(3)
      expect(result.successCount).toBe(3)
      expect(result.errorCount).toBe(0)
    })

    it('should handle partial failures', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: true })

      const result = await service.bulkUpdatePositions(
        ['pos-1', 'pos-2', 'pos-3'],
        { isActive: true }
      )

      expect(result.successCount).toBe(2)
      expect(result.errorCount).toBe(1)
    })
  })

  describe('clearAllAssignments()', () => {
    it('should clear all assignments successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const result = await service.clearAllAssignments()

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/positions/clear-assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      )
      expect(result).toBe(true)
    })
  })

  describe('clearAllShifts()', () => {
    it('should clear all shifts successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const result = await service.clearAllShifts()

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/positions/clear-shifts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      )
      expect(result).toBe(true)
    })
  })

  describe('createAssignment()', () => {
    it('should create assignment successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      })

      const result = await service.createAssignment({
        positionId: 'pos-123',
        attendantId: 'att-456',
        shiftId: 'shift-789',
        role: 'ATTENDANT'
      })

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            volunteerId: 'att-456',
            positionId: 'pos-123',
            shiftId: 'shift-789',
            role: 'ATTENDANT'
          })
        }
      )
      expect(result).toBe(true)
    })
  })

  describe('deleteAssignment()', () => {
    it('should delete assignment successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const result = await service.deleteAssignment('assignment-123')

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/assignments/assignment-123`,
        { method: 'DELETE' }
      )
      expect(result).toBe(true)
    })
  })

  describe('activatePosition()', () => {
    it('should activate position successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const result = await service.activatePosition('pos-123')

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/positions/pos-123`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true })
        }
      )
      expect(result).toBe(true)
    })
  })

  describe('deactivatePosition()', () => {
    it('should deactivate position successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const result = await service.deactivatePosition('pos-123')

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/events/${mockEventId}/positions/pos-123`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false })
        }
      )
      expect(result).toBe(true)
    })
  })
})
