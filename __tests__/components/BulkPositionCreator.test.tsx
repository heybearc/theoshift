import { render, screen, waitFor } from '@testing-library/react'
import BulkPositionCreator, {
  normalizeShiftTemplates
} from '../../components/positions/BulkPositionCreator'

describe('normalizeShiftTemplates', () => {
  it('turns the keyed template object into a list that supports find', () => {
    const list = normalizeShiftTemplates({
      standard: {
        name: 'Standard Day Schedule',
        description: '2-hour shifts',
        shifts: [{ name: 'Morning 1', startTime: '07:50', endTime: '10:00' }]
      }
    })

    expect(list.find((template) => template.id === 'standard')).toEqual({
      id: 'standard',
      name: 'Standard Day Schedule',
      description: '2-hour shifts',
      shifts: [{ name: 'Morning 1', startTime: '07:50', endTime: '10:00' }],
      isSystemTemplate: false
    })
  })

  it('keeps an array of saved templates', () => {
    const list = normalizeShiftTemplates([
      {
        id: 'abc',
        name: 'All Day',
        description: 'Single all-day shift',
        shifts: [{ name: 'All Day', isAllDay: true }],
        isSystemTemplate: true
      }
    ])

    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('abc')
  })

  it('ignores payloads that are not a list or object', () => {
    expect(normalizeShiftTemplates(null)).toEqual([])
    expect(normalizeShiftTemplates('standard')).toEqual([])
  })
})

describe('BulkPositionCreator', () => {
  it('stays open when the template API returns a keyed object', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          standard: {
            name: 'Standard Day Schedule',
            description: '2-hour shifts',
            shifts: [{ name: 'Morning 1', startTime: '07:50', endTime: '10:00' }]
          }
        }
      })
    }) as jest.Mock

    render(
      <BulkPositionCreator
        eventId="evt"
        onSuccess={jest.fn()}
        onCancel={jest.fn()}
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Bulk Create Positions' })
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'Standard Day Schedule' })
      ).toBeInTheDocument()
    })
  })
})
