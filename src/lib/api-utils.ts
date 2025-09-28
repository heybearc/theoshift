import { NextResponse } from 'next/server'
<<<<<<< HEAD
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

/**
 * Standard API response format
 */
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Success response helper
 */
export function successResponse<T>(
  data: T, 
  message?: string,
  pagination?: APIResponse['pagination']
): NextResponse {
  const response: APIResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(pagination && { pagination })
  }
  
  return NextResponse.json(response)
}

/**
 * Error response helper
 */
export function errorResponse(
  error: string, 
  status: number = 400,
  details?: any
): NextResponse {
  const response: APIResponse = {
    success: false,
    error,
    ...(details && { details })
  }
  
  return NextResponse.json(response, { status })
}

/**
 * Handle common API errors
 */
export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Zod validation errors
  if (error instanceof ZodError) {
    return errorResponse(
      'Validation failed',
      400,
      error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    )
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return errorResponse('Record already exists', 409)
      case 'P2025':
        return errorResponse('Record not found', 404)
      case 'P2003':
        return errorResponse('Foreign key constraint failed', 400)
      default:
        return errorResponse('Database error', 500)
    }
  }

  // Generic errors
  if (error instanceof Error) {
    return errorResponse(error.message, 500)
  }

  return errorResponse('Internal server error', 500)
}

/**
 * Parse pagination parameters from request
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * Create pagination response
 */
export function createPagination(
  page: number,
  limit: number,
  total: number
): APIResponse['pagination'] {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
}
=======

export function successResponse(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export function handleAPIError(error: any) {
  console.error('API Error:', error)
  return errorResponse('Internal server error', 500)
}
>>>>>>> feature/admin-module-events-management
