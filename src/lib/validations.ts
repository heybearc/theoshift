import { z } from 'zod'

/**
 * User validation schemas
 */
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'ATTENDANT']),
  phone: z.string().optional(),
  isActive: z.boolean().default(true)
})

export const UpdateUserSchema = CreateUserSchema.partial().omit({ email: true })

export const UserQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'ATTENDANT']).optional(),
  isActive: z.boolean().optional()
})

/**
 * Event validation schemas
 */
export const CreateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  location: z.string().optional(),
  status: z.enum(['UPCOMING', 'CURRENT', 'COMPLETED', 'CANCELLED', 'ARCHIVED']).default('UPCOMING')
})

export const UpdateEventSchema = CreateEventSchema.partial()

export const EventQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['UPCOMING', 'CURRENT', 'COMPLETED', 'CANCELLED', 'ARCHIVED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
})

/**
 * Attendant validation schemas
 */
export const CreateAttendantSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  eventId: z.string().uuid('Invalid event ID'),
  servingAs: z.array(z.string()).default([]),
  availability: z.enum(['AVAILABLE', 'UNAVAILABLE', 'LIMITED']).default('AVAILABLE'),
  notes: z.string().optional()
})

export const UpdateAttendantSchema = CreateAttendantSchema.partial().omit({ userId: true, eventId: true })

/**
 * Position validation schemas
 */
export const CreatePositionSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  number: z.number().int().positive('Position number must be positive'),
  name: z.string().optional(),
  description: z.string().optional(),
  department: z.string().optional(),
  isAllDay: z.boolean().default(false)
})

export const UpdatePositionSchema = CreatePositionSchema.partial().omit({ eventId: true })

/**
 * Generic ID parameter validation
 */
export const IdParamSchema = z.object({
  id: z.string().uuid('Invalid ID format')
})

/**
 * Bulk operation schemas
 */
export const BulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required')
})

export const BulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
  data: z.record(z.string(), z.any())
})

/**
 * Type exports for use in API routes
 */
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type UserQueryInput = z.infer<typeof UserQuerySchema>

export type CreateEventInput = z.infer<typeof CreateEventSchema>
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>
export type EventQueryInput = z.infer<typeof EventQuerySchema>

export type CreateAttendantInput = z.infer<typeof CreateAttendantSchema>
export type UpdateAttendantInput = z.infer<typeof UpdateAttendantSchema>

export type CreatePositionInput = z.infer<typeof CreatePositionSchema>
export type UpdatePositionInput = z.infer<typeof UpdatePositionSchema>

export type IdParam = z.infer<typeof IdParamSchema>
export type BulkDeleteInput = z.infer<typeof BulkDeleteSchema>
export type BulkUpdateInput = z.infer<typeof BulkUpdateSchema>
