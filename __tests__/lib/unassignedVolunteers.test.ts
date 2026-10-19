import { listUnassignedVolunteers } from '../../components/positions-next/unassignedVolunteers'
import type { Position, Volunteer } from '../../components/positions-next/types'

const volunteer = (partial: Partial<Volunteer> & Pick<Volunteer, 'id'>): Volunteer => ({
  firstName: 'A',
  lastName: 'Person',
  isActive: true,
  ...partial,
})

describe('listUnassignedVolunteers', () => {
  const positions: Position[] = [
    {
      id: 'p1',
      name: 'Gate',
      positionNumber: 1,
      isActive: true,
      assignments: [
        {
          id: 'a1',
          role: 'VOLUNTEER',
          volunteer: { id: 'assigned', firstName: 'Ann', lastName: 'Assigned' },
        },
      ],
      oversight: [
        {
          overseer: { id: 'lead', firstName: 'Lee', lastName: 'Lead' },
        },
      ],
    },
  ]

  it('keeps active people who are not assigned and not leadership', () => {
    const open = volunteer({ id: 'open', firstName: 'Open', lastName: 'Seat' })
    const result = listUnassignedVolunteers(positions, [
      open,
      volunteer({ id: 'assigned', firstName: 'Ann', lastName: 'Assigned' }),
      volunteer({ id: 'lead', firstName: 'Lee', lastName: 'Lead' }),
      volunteer({ id: 'off', firstName: 'Off', lastName: 'Duty', isActive: false }),
      volunteer({ id: 'key', firstName: 'Kay', lastName: 'Man', isKeyman: true }),
    ])
    expect(result.map((v) => v.id)).toEqual(['open'])
  })
})
