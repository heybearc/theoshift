import { z } from 'zod'

/** A blank counter select posts "" — treat that as no volunteer, not a bad id. */
const optionalVolunteerId = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().uuid().nullable().optional()
)

export const putCountGroupsSchema = z.object({
  groups: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      primaryVolunteerId: optionalVolunteerId,
      secondaryVolunteerId: optionalVolunteerId,
      positionIds: z.array(z.string().uuid()).min(1),
    })
  ),
})
