import { renderHook, act } from '@testing-library/react'
import { useAssignments } from '../../hooks/useAssignments'
import { createPositionService } from '../../lib/positionService'
import { notifyAlert } from '../../lib/ui/toast'
import { appConfirmMessage } from '../../lib/ui/confirm'

jest.mock('../../lib/ui/toast', () => ({
  notifyAlert: jest.fn(),
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))
jest.mock('../../lib/ui/confirm', () => ({
  appConfirmMessage: jest.fn(),
  appConfirm: jest.fn(),
}))

jest.mock('../../lib/positionService')
jest.mock('next/router', () => ({
  useRouter: () => ({
    reload: jest.fn(),
    push: jest.fn(),
  }),
}))

const mockPositionService = {
  createAssignment: jest.fn(),
  deleteAssignment: jest.fn(),
  clearAllAssignments: jest.fn(),
}

;(createPositionService as jest.Mock).mockReturnValue(mockPositionService)

describe('useAssignments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(appConfirmMessage as jest.Mock).mockResolvedValue(true)
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAssignments({ eventId: 'event-1' }))

    expect(result.current.showAssignAttendantModal).toBe(false)
    expect(result.current.selectedShift).toBeNull()
  })

  it('should toggle assignment modal', () => {
    const { result } = renderHook(() => useAssignments({ eventId: 'event-1' }))

    act(() => {
      result.current.setShowAssignAttendantModal(true)
    })

    expect(result.current.showAssignAttendantModal).toBe(true)

    act(() => {
      result.current.setShowAssignAttendantModal(false)
    })

    expect(result.current.showAssignAttendantModal).toBe(false)
  })

  it('should set selected shift', () => {
    const { result } = renderHook(() => useAssignments({ eventId: 'event-1' }))

    const mockShift = { id: 'shift-1', name: 'Morning' }

    act(() => {
      result.current.setSelectedShift(mockShift)
    })

    expect(result.current.selectedShift).toEqual(mockShift)
  })

  it('should handle create assignment', async () => {
    mockPositionService.createAssignment.mockResolvedValue(true)

    const { result } = renderHook(() => useAssignments({ eventId: 'event-1' }))

    await act(async () => {
      await result.current.handleCreateAssignment('position-1', 'shift-1', 'attendant-1')
    })

    expect(mockPositionService.createAssignment).toHaveBeenCalledWith({
      positionId: 'position-1',
      shiftId: 'shift-1',
      attendantId: 'attendant-1',
      role: 'VOLUNTEER',
    })
  })

  it('should handle remove assignment', async () => {
    mockPositionService.deleteAssignment.mockResolvedValue(true)

    const { result } = renderHook(() => useAssignments({ eventId: 'event-1' }))

    await act(async () => {
      await result.current.handleRemoveAssignment('assignment-1')
    })

    expect(mockPositionService.deleteAssignment).toHaveBeenCalledWith('assignment-1')
  })

  it('should not remove assignment when user cancels', async () => {
    ;(appConfirmMessage as jest.Mock).mockResolvedValue(false)

    const { result } = renderHook(() => useAssignments({ eventId: 'event-1' }))

    await act(async () => {
      await result.current.handleRemoveAssignment('assignment-1')
    })

    expect(mockPositionService.deleteAssignment).not.toHaveBeenCalled()
  })

  it('should handle clear all assignments', async () => {
    mockPositionService.clearAllAssignments.mockResolvedValue(true)

    const { result } = renderHook(() => useAssignments({ eventId: 'event-1' }))

    await act(async () => {
      await result.current.handleClearAllAssignments()
    })

    expect(mockPositionService.clearAllAssignments).toHaveBeenCalled()
  })

  it('should handle create assignment failure', async () => {
    mockPositionService.createAssignment.mockResolvedValue(false)

    const { result } = renderHook(() => useAssignments({ eventId: 'event-1' }))

    await act(async () => {
      await result.current.handleCreateAssignment('position-1', 'shift-1', 'attendant-1')
    })

    expect(notifyAlert).toHaveBeenCalledWith('Failed to create assignment')
  })
})
