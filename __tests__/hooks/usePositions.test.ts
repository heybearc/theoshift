import { renderHook, act } from '@testing-library/react'
import { usePositions } from '../../hooks/usePositions'
import { createPositionService } from '../../lib/positionService'
import { appConfirmMessage } from '../../lib/ui/confirm'

jest.mock('../../lib/ui/toast', () => ({
  notifyAlert: jest.fn(),
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))
jest.mock('../../lib/ui/confirm', () => ({
  appConfirmMessage: jest.fn(),
  appConfirm: jest.fn(),
}))

// Mock the positionService
jest.mock('../../lib/positionService')
jest.mock('next/router', () => ({
  useRouter: () => ({
    reload: jest.fn(),
    push: jest.fn(),
  }),
}))

const mockPositionService = {
  deletePosition: jest.fn(),
  activatePosition: jest.fn(),
  deactivatePosition: jest.fn(),
  hardDeletePosition: jest.fn(),
}

;(createPositionService as jest.Mock).mockReturnValue(mockPositionService)

describe('usePositions', () => {
  const mockPositions = [
    {
      id: '1',
      positionNumber: 1,
      name: 'Test Position 1',
      area: 'Main Hall',
      description: 'Test description',
      isActive: true,
      shifts: [],
      assignments: [],
    },
    {
      id: '2',
      positionNumber: 2,
      name: 'Test Position 2',
      area: 'Parking',
      description: 'Test description 2',
      isActive: false,
      shifts: [],
      assignments: [],
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    ;(appConfirmMessage as jest.Mock).mockResolvedValue(true)
  })

  it('should initialize with provided positions', () => {
    const { result } = renderHook(() =>
      usePositions({ eventId: 'event-1', initialPositions: mockPositions })
    )

    expect(result.current.positions).toEqual(mockPositions)
    expect(result.current.selectedPosition).toBeNull()
    expect(result.current.editingPosition).toBeNull()
  })

  it('should filter active positions by default', () => {
    const { result } = renderHook(() =>
      usePositions({ eventId: 'event-1', initialPositions: mockPositions })
    )

    const filtered = result.current.getFilteredPositions()
    expect(filtered).toHaveLength(1)
    expect(filtered[0].isActive).toBe(true)
  })

  it('should show inactive positions when showInactive is true', () => {
    const { result } = renderHook(() =>
      usePositions({ eventId: 'event-1', initialPositions: mockPositions })
    )

    act(() => {
      result.current.setShowInactive(true)
    })

    const filtered = result.current.getFilteredPositions()
    expect(filtered).toHaveLength(2)
  })

  it('should toggle position selection', () => {
    const { result } = renderHook(() =>
      usePositions({ eventId: 'event-1', initialPositions: mockPositions })
    )

    act(() => {
      result.current.togglePositionSelection('1')
    })

    expect(result.current.selectedPositions.has('1')).toBe(true)

    act(() => {
      result.current.togglePositionSelection('1')
    })

    expect(result.current.selectedPositions.has('1')).toBe(false)
  })

  it('should select all positions', () => {
    const { result } = renderHook(() =>
      usePositions({ eventId: 'event-1', initialPositions: mockPositions })
    )

    act(() => {
      result.current.setShowInactive(true)
    })
    act(() => {
      result.current.selectAllPositions()
    })

    expect(result.current.selectedPositions.size).toBe(2)
    expect(result.current.selectedPositions.has('1')).toBe(true)
    expect(result.current.selectedPositions.has('2')).toBe(true)
  })

  it('should clear selection', () => {
    const { result } = renderHook(() =>
      usePositions({ eventId: 'event-1', initialPositions: mockPositions })
    )

    act(() => {
      result.current.setShowInactive(true)
    })
    act(() => {
      result.current.selectAllPositions()
    })

    expect(result.current.selectedPositions.size).toBe(2)

    act(() => {
      result.current.clearSelection()
    })

    expect(result.current.selectedPositions.size).toBe(0)
  })

  it('should handle delete position', async () => {
    mockPositionService.deletePosition.mockResolvedValue(true)

    const { result } = renderHook(() =>
      usePositions({ eventId: 'event-1', initialPositions: mockPositions })
    )

    await act(async () => {
      await result.current.handleDelete('1')
    })

    expect(mockPositionService.deletePosition).toHaveBeenCalledWith('1')
  })

  it('should handle activate position', async () => {
    mockPositionService.activatePosition.mockResolvedValue(true)

    const { result } = renderHook(() =>
      usePositions({ eventId: 'event-1', initialPositions: mockPositions })
    )

    await act(async () => {
      await result.current.handleActivate('2')
    })

    expect(mockPositionService.activatePosition).toHaveBeenCalledWith('2')
  })

  it('should handle deactivate position', async () => {
    mockPositionService.deactivatePosition.mockResolvedValue(true)

    const { result } = renderHook(() =>
      usePositions({ eventId: 'event-1', initialPositions: mockPositions })
    )

    await act(async () => {
      await result.current.handleDeactivate('1')
    })

    expect(mockPositionService.deactivatePosition).toHaveBeenCalledWith('1')
  })

  it('should not delete when user cancels confirmation', async () => {
    ;(appConfirmMessage as jest.Mock).mockResolvedValue(false)

    const { result } = renderHook(() =>
      usePositions({ eventId: 'event-1', initialPositions: mockPositions })
    )

    await act(async () => {
      await result.current.handleDelete('1')
    })

    expect(mockPositionService.deletePosition).not.toHaveBeenCalled()
  })

  it('should handle bulk delete', async () => {
    mockPositionService.deletePosition.mockResolvedValue(true)

    const { result } = renderHook(() =>
      usePositions({ eventId: 'event-1', initialPositions: mockPositions })
    )

    act(() => {
      result.current.togglePositionSelection('1')
    })
    act(() => {
      result.current.togglePositionSelection('2')
    })

    await act(async () => {
      await result.current.handleBulkDelete()
    })

    expect(mockPositionService.deletePosition).toHaveBeenCalledTimes(2)
  })
})
