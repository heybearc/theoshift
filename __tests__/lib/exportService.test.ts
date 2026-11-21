/**
 * Unit tests for ExportService
 * Tests the extracted export service layer
 */

import { ExportService, exportService, createExportService } from '../../lib/exportService'
import { notifyAlert } from '../../lib/ui/toast'

jest.mock('../../lib/ui/toast', () => ({
  notifyAlert: jest.fn(),
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

describe('ExportService', () => {
  let service: ExportService

  beforeEach(() => {
    service = new ExportService()
    global.fetch = jest.fn()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(ExportService)
    })

    it('should create service via factory function', () => {
      const factoryService = createExportService()
      expect(factoryService).toBeInstanceOf(ExportService)
    })

    it('should provide singleton instance', () => {
      expect(exportService).toBeInstanceOf(ExportService)
    })
  })

  describe('exportToPDF()', () => {
    it('should export PDF successfully', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: async () => mockBlob
      })

      const result = await service.exportToPDF({
        eventId: 'event-123',
        eventName: 'Test Event',
        positions: []
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/export/positions-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: 'event-123',
          eventName: 'Test Event',
          positions: []
        })
      })
      expect(result.success).toBe(true)
      expect(result.blob).toBe(mockBlob)
    })

    it('should handle export failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false })

      const result = await service.exportToPDF({
        eventId: 'event-123',
        eventName: 'Test Event',
        positions: []
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to export PDF')
    })

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      const result = await service.exportToPDF({
        eventId: 'event-123',
        eventName: 'Test Event',
        positions: []
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('exportToExcel()', () => {
    it('should export Excel successfully', async () => {
      const mockBlob = new Blob(['excel content'], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: async () => mockBlob
      })

      const result = await service.exportToExcel({
        eventId: 'event-123',
        eventName: 'Test Event',
        positions: []
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/export/positions-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: 'event-123',
          eventName: 'Test Event',
          positions: []
        })
      })
      expect(result.success).toBe(true)
      expect(result.blob).toBe(mockBlob)
    })

    it('should handle export failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false })

      const result = await service.exportToExcel({
        eventId: 'event-123',
        eventName: 'Test Event',
        positions: []
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to export Excel')
    })
  })

  describe('downloadBlob()', () => {
    it('should trigger download', () => {
      const mockBlob = new Blob(['test content'])
      const mockClick = jest.fn()
      
      // Mock createElement to return an element with click method
      const originalCreateElement = document.createElement
      document.createElement = jest.fn((tagName) => {
        if (tagName === 'a') {
          const element = originalCreateElement.call(document, tagName)
          element.click = mockClick
          return element
        }
        return originalCreateElement.call(document, tagName)
      })

      service.downloadBlob(mockBlob, 'test.pdf')

      expect(mockClick).toHaveBeenCalled()
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
      expect(global.URL.revokeObjectURL).toHaveBeenCalled()

      // Restore original createElement
      document.createElement = originalCreateElement
    })
  })

  describe('generateFilename()', () => {
    it('should generate PDF filename', () => {
      const filename = service.generateFilename('Test Event', 'pdf')
      
      expect(filename).toMatch(/^positions-Test-Event-\d{4}-\d{2}-\d{2}\.pdf$/)
    })

    it('should generate Excel filename', () => {
      const filename = service.generateFilename('Test Event', 'xlsx')
      
      expect(filename).toMatch(/^positions-Test-Event-\d{4}-\d{2}-\d{2}\.xlsx$/)
    })

    it('should sanitize event name', () => {
      const filename = service.generateFilename('Test Event With Spaces', 'pdf')
      
      expect(filename).toContain('Test-Event-With-Spaces')
    })
  })

  describe('exportAndDownloadPDF()', () => {
    it('should export and download PDF successfully', async () => {
      const mockBlob = new Blob(['pdf content'])
      const mockClick = jest.fn()
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: async () => mockBlob
      })

      const originalCreateElement = document.createElement
      document.createElement = jest.fn((tagName) => {
        if (tagName === 'a') {
          const element = originalCreateElement.call(document, tagName)
          element.click = mockClick
          return element
        }
        return originalCreateElement.call(document, tagName)
      })

      const result = await service.exportAndDownloadPDF({
        eventId: 'event-123',
        eventName: 'Test Event',
        positions: []
      })

      expect(result).toBe(true)
      expect(mockClick).toHaveBeenCalled()
      expect(notifyAlert).not.toHaveBeenCalled()

      document.createElement = originalCreateElement
    })

    it('should show alert on failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false })

      const result = await service.exportAndDownloadPDF({
        eventId: 'event-123',
        eventName: 'Test Event',
        positions: []
      })

      expect(result).toBe(false)
      expect(notifyAlert).toHaveBeenCalledWith('Failed to export PDF')
    })
  })

  describe('exportAndDownloadExcel()', () => {
    it('should export and download Excel successfully', async () => {
      const mockBlob = new Blob(['excel content'])
      const mockClick = jest.fn()
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: async () => mockBlob
      })

      const originalCreateElement = document.createElement
      document.createElement = jest.fn((tagName) => {
        if (tagName === 'a') {
          const element = originalCreateElement.call(document, tagName)
          element.click = mockClick
          return element
        }
        return originalCreateElement.call(document, tagName)
      })

      const result = await service.exportAndDownloadExcel({
        eventId: 'event-123',
        eventName: 'Test Event',
        positions: []
      })

      expect(result).toBe(true)
      expect(mockClick).toHaveBeenCalled()
      expect(notifyAlert).not.toHaveBeenCalled()

      document.createElement = originalCreateElement
    })

    it('should show alert on failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false })

      const result = await service.exportAndDownloadExcel({
        eventId: 'event-123',
        eventName: 'Test Event',
        positions: []
      })

      expect(result).toBe(false)
      expect(notifyAlert).toHaveBeenCalledWith('Failed to export Excel')
    })
  })
})
