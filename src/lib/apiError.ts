/**
 * Centralized API error handling utility
 * Provides consistent error responses across all API endpoints
 */

import { NextApiResponse } from 'next'
import { logger } from './logger'
import { ZodError } from 'zod'
import { Prisma } from '@/generated/prisma/client'

export interface ApiErrorResponse {
  success: false
  error: string
  details?: string
  code?: string
}

/**
 * Standard error handler for API endpoints
 * Logs the error and returns a consistent error response
 */
export function handleApiError(
  res: NextApiResponse,
  error: unknown,
  context: string
): void {
  // Log the error
  logger.error(`${context}:`, error)

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      code: 'VALIDATION_ERROR'
    })
    return
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        res.status(409).json({
          success: false,
          error: 'A record with this value already exists',
          code: 'DUPLICATE_RECORD'
        })
        return
      case 'P2025':
        res.status(404).json({
          success: false,
          error: 'Record not found',
          code: 'NOT_FOUND'
        })
        return
      default:
        res.status(500).json({
          success: false,
          error: 'Database error',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          code: error.code
        })
        return
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: 'INTERNAL_ERROR'
    })
    return
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  })
}

/**
 * Return a success response with consistent format
 */
export function apiSuccess<T>(
  res: NextApiResponse,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message })
  })
}

/**
 * Return an error response with consistent format
 */
export function apiError(
  res: NextApiResponse,
  error: string,
  statusCode: number = 400,
  details?: string,
  code?: string
): void {
  res.status(statusCode).json({
    success: false,
    error,
    ...(details && { details }),
    ...(code && { code })
  })
}
