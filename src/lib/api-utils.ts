import { NextResponse } from 'next/server'

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