import { renderHook, act } from '@testing-library/react'
import { useShifts } from '../../hooks/useShifts'
import { createPositionService } from '../../lib/positionService'
import { notifyAlert } from '../../lib/ui/toast'
import { appConfirmMessage } from '../../lib/ui/confirm'

jest.mock('../../lib/positionService')
jest.mock('../../lib/ui/toast', () => ({
  notifyAlert: jest.fn(),
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))
jest.mock('../../lib/ui/confirm', () => ({
  appConfirmMessage: jest.fn(),
  appConfirm: jest.fn(),
}))
jest.mock('next/router', () => ({
  useRouter: () => ({
    reload: jest.fn(),
    push: jest.fn(),
  }),
}))

const mockPositionService = {
  createShift: jest.fn(),
  deleteShift: jest.fn(),
}

;(createPositionService as jest.Mock).mockReturnValue(mockPositionService)

describe('useShifts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(appConfirmMessage as jest.Mock).mockResolvedValue(true)
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useShifts({ eventId: 'event-1' }))

    expect(result.current.showShiftModal).toBe(false)
    expect(result.current.shiftFormData).toEqual({
      name: '',
      startTime: '',
      endTime: '',
      isAllDay: false,
      volunteersNeeded: 1,
      shiftDate: null,
    })
  })

  it('should update shift form data', () => {
    const { result } = renderHook(() => useShifts({ eventId: 'event-1' }))

    act(() => {
      result.current.setShiftFormData({
        name: 'Morning',
        startTime: '08:00',
        endTime: '12:00',
        isAllDay: false,
        volunteersNeeded: 1,
      })
    })

    expect(result.current.shiftFormData.name).toBe('Morning')
    expect(result.current.shiftFormData.startTime).toBe('08:00')
  })

  it('should handle shift submit successfully', async () => {
    mockPositionService.createShift.mockResolvedValue(true)

    const { result } = renderHook(() => useShifts({ eventId: 'event-1' }))

    const mockEvent = { preventDefault: jest.fn() } as any
    const mockPosition = {
      id: 'position-1',
      name: 'Test Position',
      shifts: [],
    }

    act(() => {
      result.current.setShiftFormData({
        name: 'Morning',
        startTime: '08:00',
        endTime: '12:00',
        isAllDay: false,
        volunteersNeeded: 1,
      })
    })

    await act(async () => {
      await result.current.handleShiftSubmit(mockEvent, mockPosition)
    })

    expect(mockPositionService.createShift).toHaveBeenCalledWith('position-1', {
      name: 'Morning',
      startTime: '08:00',
      endTime: '12:00',
      isAllDay: false,
      volunteersNeeded: 1,
      shiftDate: undefined,
    })
    expect(notifyAlert).toHaveBeenCalledWith('✅ Shift added successfully')
  })

  it('should prevent all-day shift when partial shifts exist', async () => {
    const { result } = renderHook(() => useShifts({ eventId: 'event-1' }))

    const mockEvent = { preventDefault: jest.fn() } as any
    const mockPosition = {
      id: 'position-1',
      name: 'Test Position',
      shifts: [
        { id: 'shift-1', name: 'Morning', isAllDay: false, startTime: '08:00', endTime: '12:00' },
      ],
    }

    act(() => {
      result.current.setShiftFormData({
        name: 'All Day',
        startTime: '',
        endTime: '',
        isAllDay: true,
        volunteersNeeded: 1,
      })
    })

    await act(async () => {
      await result.current.handleShiftSubmit(mockEvent, mockPosition)
    })

    expect(mockPositionService.createShift).not.toHaveBeenCalled()
    expect(notifyAlert).toHaveBeenCalledWith(expect.stringContaining('Cannot add All Day shift'))
  })

  it('should handle delete shift', async () => {
    mockPositionService.deleteShift.mockResolvedValue(true)

    const { result } = renderHook(() => useShifts({ eventId: 'event-1' }))

    await act(async () => {
      await result.current.handleDeleteShift('position-1', 'shift-1', 'Morning')
    })

    expect(mockPositionService.deleteShift).toHaveBeenCalledWith('position-1', 'shift-1')
  })

  it('should not delete shift when user cancels', async () => {
    ;(appConfirmMessage as jest.Mock).mockResolvedValue(false)

    const { result } = renderHook(() => useShifts({ eventId: 'event-1' }))

    await act(async () => {
      await result.current.handleDeleteShift('position-1', 'shift-1', 'Morning')
    })

    expect(mockPositionService.deleteShift).not.toHaveBeenCalled()
  })
})
