import {
  listEventKeymen,
  listEventOverseers,
} from '../../components/positions-next/eventOversightOptions'
import type { Volunteer } from '../../components/positions-next/types'

const person = (partial: Partial<Volunteer> & Pick<Volunteer, 'id'>): Volunteer => ({
  firstName: 'A',
  lastName: 'Person',
  isActive: true,
  ...partial,
})

describe('event oversight options', () => {
  const roster = [
    person({ id: 'vol', firstName: 'Val', lastName: 'Volunteer' }),
    person({ id: 'over', firstName: 'Olivia', lastName: 'Overseer', isOverseer: true }),
    person({ id: 'key', firstName: 'Ken', lastName: 'Keyman', isKeyman: true }),
    person({
      id: 'both',
      firstName: 'Blair',
      lastName: 'Both',
      isOverseer: true,
      isKeyman: true,
    }),
    person({
      id: 'inactive',
      firstName: 'Ian',
      lastName: 'Inactive',
      isOverseer: true,
      isActive: false,
    }),
  ]

  it('lists only active overseers on the event', () => {
    expect(listEventOverseers(roster).map((person) => person.id)).toEqual(['both', 'over'])
  })

  it('lists only active keymen on the event', () => {
    expect(listEventKeymen(roster).map((person) => person.id)).toEqual(['both', 'key'])
  })
})