import { randomUUID } from 'crypto'
import { prisma } from './prisma'
import { findVolunteerByEmailCaseInsensitive } from './volunteerEmailLookup'
import { decryptReviewCode, encryptReviewCode, reviewCodesMatch } from './reviewSignInCrypto'

export const REVIEW_SIGNIN_KEY = 'review_signin'
const MAX_FAILURES = 8
const LOCK_MS = 15 * 60 * 1000
export const MIN_REVIEW_CODE_LENGTH = 10

type ReviewRecord = {
  email: string
  codeEnc: string
  failCount: number
  lockedUntil: string | null
}

export function reviewSignInInstructions(email: string, code: string) {
  return [
    'App Store Connect → App Review Information',
    'Sign-in required: yes',
    `User name: ${email}`,
    `Password: ${code}`,
    'Notes: TheoShift is for invited volunteers. This review account does not use an email link. On the phone, enter the email and sign-in code, then tap Sign in with code. On the website, open https://theoshift.com/auth/signin, choose Volunteer, and use the same email and sign-in code.',
    '',
    'Google Play Console → Policy → App content → App access',
    'Choose: All or some functionality is restricted.',
    'Instructions: Enter the email and sign-in code on the sign-in screen, then tap Sign in with code. No email link is required.',
  ].join('\n')
}

async function readRecord(): Promise<ReviewRecord | null> {
  const row = await prisma.system_settings.findUnique({ where: { key: REVIEW_SIGNIN_KEY } })
  if (!row) return null
  try {
    const parsed = JSON.parse(row.value) as ReviewRecord
    if (!parsed?.email || !parsed?.codeEnc) return null
    return parsed
  } catch {
    return null
  }
}

async function writeRecord(record: ReviewRecord, userId: string | null) {
  const value = JSON.stringify(record)
  await prisma.system_settings.upsert({
    where: { key: REVIEW_SIGNIN_KEY },
    update: { value, updatedBy: userId, updatedAt: new Date() },
    create: {
      id: randomUUID(),
      key: REVIEW_SIGNIN_KEY,
      value,
      createdBy: userId,
      updatedBy: userId,
      updatedAt: new Date(),
    },
  })
}

export async function getReviewSignInForAdmin() {
  const record = await readRecord()
  if (!record) {
    return { email: '', code: '', assignmentCount: 0, configured: false }
  }
  let code = ''
  try {
    code = decryptReviewCode(record.codeEnc)
  } catch {
    code = ''
  }
  const volunteer = await findVolunteerByEmailCaseInsensitive(record.email)
  const assignmentCount = volunteer
    ? await prisma.position_assignments.count({ where: { volunteerId: volunteer.id } })
    : 0
  return { email: record.email, code, assignmentCount, configured: Boolean(code) }
}

export async function saveReviewSignIn(emailRaw: string, codeRaw: string, userId: string | null) {
  const code = codeRaw.trim()
  if (code.length < MIN_REVIEW_CODE_LENGTH) {
    return { ok: false as const, error: `Use a sign-in code of at least ${MIN_REVIEW_CODE_LENGTH} characters.` }
  }
  const volunteer = await findVolunteerByEmailCaseInsensitive(emailRaw)
  if (!volunteer || !volunteer.isActive) {
    return { ok: false as const, error: 'That email is not an active volunteer record.' }
  }
  await writeRecord(
    {
      email: volunteer.email,
      codeEnc: encryptReviewCode(code),
      failCount: 0,
      lockedUntil: null,
    },
    userId
  )
  return { ok: true as const, email: volunteer.email, code }
}

export async function verifyReviewSignIn(emailRaw: string, codeRaw: string) {
  const record = await readRecord()
  if (!record) {
    return { ok: false as const, status: 400, error: 'Sign-in codes are not set up. Use the email link.' }
  }

  if (record.lockedUntil && new Date(record.lockedUntil).getTime() > Date.now()) {
    return { ok: false as const, status: 429, error: 'Too many tries. Wait 15 minutes and use the same email and code.' }
  }

  let stored = ''
  try {
    stored = decryptReviewCode(record.codeEnc)
  } catch {
    return { ok: false as const, status: 400, error: 'Sign-in codes are not set up. Use the email link.' }
  }

  const volunteer = await findVolunteerByEmailCaseInsensitive(emailRaw)
  const emailMatches = Boolean(volunteer && volunteer.email.toLowerCase() === record.email.toLowerCase())
  const codeMatches = reviewCodesMatch(stored, codeRaw.trim())
  if (!emailMatches || !codeMatches || !volunteer?.isActive) {
    const failCount = emailMatches ? record.failCount + 1 : record.failCount
    const lockedUntil = emailMatches && failCount >= MAX_FAILURES ? new Date(Date.now() + LOCK_MS).toISOString() : record.lockedUntil
    if (emailMatches) {
      await writeRecord({ ...record, failCount: lockedUntil ? 0 : failCount, lockedUntil }, null)
    }
    return { ok: false as const, status: 401, error: 'That email or sign-in code is not valid.' }
  }

  if (record.failCount || record.lockedUntil) {
    await writeRecord({ ...record, failCount: 0, lockedUntil: null }, null)
  }

  return { ok: true as const, volunteer }
}
