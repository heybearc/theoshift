import { putCountGroupsSchema } from '../../src/lib/countGroupPayload'

const station = '11111111-1111-4111-8111-111111111111'
const volunteer = '22222222-2222-4222-8222-222222222222'

describe('putCountGroupsSchema', () => {
  it('accepts a new group with blank counters', () => {
    const parsed = putCountGroupsSchema.safeParse({
      groups: [
        {
          name: 'Section A',
          primaryVolunteerId: '',
          secondaryVolunteerId: '',
          positionIds: [station],
        },
      ],
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.groups[0].primaryVolunteerId).toBeNull()
      expect(parsed.data.groups[0].secondaryVolunteerId).toBeNull()
    }
  })

  it('accepts a volunteer id on either counter', () => {
    const parsed = putCountGroupsSchema.safeParse({
      groups: [
        {
          name: 'Section A',
          primaryVolunteerId: volunteer,
          secondaryVolunteerId: null,
          positionIds: [station],
        },
      ],
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects a group with no stations', () => {
    const parsed = putCountGroupsSchema.safeParse({
      groups: [
        {
          name: 'Section A',
          primaryVolunteerId: null,
          secondaryVolunteerId: null,
          positionIds: [],
        },
      ],
    })
    expect(parsed.success).toBe(false)
  })
})
