import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

interface ImportRow {
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: string
  department?: string
  notes?: string
}

interface ValidationError {
  row: number
  field: string
  message: string
  value: string
}

interface ImportResult {
  success: boolean
  totalRows: number
  successCount: number
  errorCount: number
  errors: ValidationError[]
  createdUsers: any[]
}

// GET - Download CSV template
export async function GET(request: NextRequest) {
  const csvTemplate = `firstName,lastName,email,phone,role,department,notes
John,Smith,john.smith@email.com,(555) 123-4567,ATTENDANT,Sound,Has experience with sound equipment
Mary,Johnson,mary.j@email.com,(555) 987-6543,KEYMAN,Platform,Platform coordinator for 5+ years
David,Brown,d.brown@email.com,,OVERSEER,Overall,Circuit overseer visit coordinator
Sarah,Wilson,sarah.w@email.com,(555) 456-7890,ASSISTANT_OVERSEER,Attendants,Assists with attendant scheduling`

  return new NextResponse(csvTemplate, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="user_import_template.csv"'
    }
  })
}

// POST - Import users from CSV
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
    }

    const csvText = await file.text()
    const result = await processCSVImport(csvText)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to import users:', error)
    return NextResponse.json({ error: 'Failed to import users' }, { status: 500 })
  }
}

async function processCSVImport(csvText: string): Promise<ImportResult> {
  const lines = csvText.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  
  // Validate headers
  const requiredHeaders = ['firstName', 'lastName', 'email', 'role']
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
  
  if (missingHeaders.length > 0) {
    return {
      success: false,
      totalRows: 0,
      successCount: 0,
      errorCount: 1,
      errors: [{
        row: 0,
        field: 'headers',
        message: `Missing required headers: ${missingHeaders.join(', ')}`,
        value: headers.join(', ')
      }],
      createdUsers: []
    }
  }

  const dataRows = lines.slice(1)
  const errors: ValidationError[] = []
  const validRows: ImportRow[] = []

  // Parse and validate each row
  for (let i = 0; i < dataRows.length; i++) {
    const rowNumber = i + 2 // +2 because we start from line 2 (after header)
    const values = dataRows[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    
    if (values.length !== headers.length) {
      errors.push({
        row: rowNumber,
        field: 'structure',
        message: `Row has ${values.length} columns, expected ${headers.length}`,
        value: dataRows[i]
      })
      continue
    }

    const rowData: any = {}
    headers.forEach((header, index) => {
      rowData[header] = values[index] || null
    })

    // Validate required fields
    const rowErrors = validateImportRow(rowData, rowNumber)
    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      continue
    }

    validRows.push(rowData as ImportRow)
  }

  // Check for duplicate emails within the import
  const emailCounts = new Map<string, number[]>()
  validRows.forEach((row, index) => {
    const email = row.email.toLowerCase()
    if (!emailCounts.has(email)) {
      emailCounts.set(email, [])
    }
    emailCounts.get(email)!.push(index + 2)
  })

  emailCounts.forEach((rows, email) => {
    if (rows.length > 1) {
      rows.forEach(rowNumber => {
        errors.push({
          row: rowNumber,
          field: 'email',
          message: `Duplicate email in import file`,
          value: email
        })
      })
    }
  })

  // Check for existing emails in database
  const existingEmails = await prisma.users.findMany({
    where: {
      email: {
        in: validRows.map(row => row.email.toLowerCase())
      }
    },
    select: { email: true }
  })

  const existingEmailSet = new Set(existingEmails.map(u => u.email.toLowerCase()))
  validRows.forEach((row, index) => {
    if (existingEmailSet.has(row.email.toLowerCase())) {
      errors.push({
        row: index + 2,
        field: 'email',
        message: 'Email already exists in system',
        value: row.email
      })
    }
  })

  // If there are validation errors, return them without creating users
  if (errors.length > 0) {
    return {
      success: false,
      totalRows: dataRows.length,
      successCount: 0,
      errorCount: errors.length,
      errors,
      createdUsers: []
    }
  }

  // Create users in transaction
  const createdUsers = []
  const { EmailService } = await import('../../../../../utils/email')

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        const inviteToken = crypto.randomBytes(32).toString('hex')
        const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

        const user = await tx.users.create({
          data: {
            id: crypto.randomUUID(),
            email: row.email.toLowerCase(),
            firstName: row.firstName,
            lastName: row.lastName,
            phone: row.phone || null,
            role: row.role as any,
            passwordHash: null, // Will be set when user accepts invitation
            isActive: true,
            inviteToken,
            inviteExpiry,
            updatedAt: new Date()
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            isActive: true,
            inviteToken: true,
            inviteExpiry: true,
            createdAt: true
          }
        })

        // Send invitation email
        const emailSent = await EmailService.sendInvitationEmail(
          user.email,
          `${user.firstName} ${user.lastName}`,
          inviteToken
        )

        if (!emailSent) {
          console.warn(`[USER_IMPORT] Failed to send invitation email to ${user.email}`)
        }

        createdUsers.push({
          ...user,
          department: row.department,
          notes: row.notes,
          emailSent
        })
      }
    })

    console.log(`[USER_IMPORT] Successfully imported ${createdUsers.length} users`)

    return {
      success: true,
      totalRows: dataRows.length,
      successCount: createdUsers.length,
      errorCount: 0,
      errors: [],
      createdUsers
    }
  } catch (error) {
    console.error('[USER_IMPORT] Transaction failed:', error)
    throw error
  }
}

function validateImportRow(row: any, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = []

  // Required field validation
  if (!row.firstName || row.firstName.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'firstName',
      message: 'First name is required',
      value: row.firstName || ''
    })
  }

  if (!row.lastName || row.lastName.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'lastName',
      message: 'Last name is required',
      value: row.lastName || ''
    })
  }

  if (!row.email || row.email.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'email',
      message: 'Email is required',
      value: row.email || ''
    })
  } else {
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(row.email)) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Invalid email format',
        value: row.email
      })
    }
  }

  if (!row.role || row.role.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'role',
      message: 'Role is required',
      value: row.role || ''
    })
  } else {
    // Role validation
    const validRoles = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'ATTENDANT']
    if (!validRoles.includes(row.role.toUpperCase())) {
      errors.push({
        row: rowNumber,
        field: 'role',
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        value: row.role
      })
    }
  }

  // Phone validation (optional)
  if (row.phone && row.phone.trim() !== '') {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$|^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/
    if (!phoneRegex.test(row.phone.replace(/\s+/g, ''))) {
      errors.push({
        row: rowNumber,
        field: 'phone',
        message: 'Invalid phone format',
        value: row.phone
      })
    }
  }

  return errors
}
