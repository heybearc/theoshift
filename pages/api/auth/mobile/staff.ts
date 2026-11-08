import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { findUserByEmailCaseInsensitive } from '@/lib/userEmailLookup'
import { isOversightRole, signStaffToken } from '@/lib/mobileSession'
import { parseMobileSignInBody } from '@/lib/mobileSignInBody'
import { createVolunteerSignin, mobileAccessToken } from '@/lib/volunteerSignins'
import { normalizeSigninPlatform } from '@/lib/signinAccess'

export const config = { api: { bodyParser: false } }

const MAX_BODY_BYTES = 32_000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  let fields: Record<string, unknown>
  try {
    const raw = await readBody(req)
    fields = parseMobileSignInBody(raw, req.headers['content-type'])
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === 'Sign-in body too large'
    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      error: tooLarge ? 'Sign-in request is too large' : 'Sign-in request was not readable. Try again.',
    })
  }

  const email = typeof fields.email === 'string' ? fields.email.trim() : ''
  const password = typeof fields.password === 'string' ? fields.password : ''
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' })
  }

  try {
    const user = await findUserByEmailCaseInsensitive(email)
    if (!user || !user.passwordHash || !user.isActive) {
      return res.status(401).json({ success: false, error: 'Email or password is incorrect' })
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatches) {
      return res.status(401).json({ success: false, error: 'Email or password is incorrect' })
    }

    if (!isOversightRole(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'This account uses the volunteer sign-in. Email yourself a link, or ask an admin to set an oversight role.',
      })
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    const linked = await prisma.volunteers.findFirst({
      where: { userId: user.id },
      select: { id: true, email: true, firstName: true, lastName: true, congregation: true },
    })

    let volunteerAccess: {
      accessToken: string
      volunteer: { id: string; email: string; firstName: string; lastName: string }
    } | null = null

    if (linked?.email) {
      const signin = await createVolunteerSignin(linked.id, normalizeSigninPlatform(fields.platform))
      volunteerAccess = {
        accessToken: mobileAccessToken({ ...linked, congregation: linked.congregation || '' }, signin.id),
        volunteer: {
          id: linked.id,
          email: linked.email,
          firstName: linked.firstName,
          lastName: linked.lastName,
        },
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        accessToken: signStaffToken(user),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        volunteerAccess,
      },
    })
  } catch (error) {
    console.error('Mobile staff sign-in error:', error)
    const message = error instanceof Error ? error.message : 'Failed to sign in'
    return res.status(500).json({ success: false, error: message })
  }
}

function readBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let settled = false
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      reject(error)
    }
    req.on('data', (chunk: Buffer | string) => {
      if (settled) return
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buf.length
      if (size > MAX_BODY_BYTES) {
        fail(new Error('Sign-in body too large'))
        req.destroy()
        return
      }
      chunks.push(buf)
    })
    req.on('end', () => {
      if (settled) return
      settled = true
      resolve(Buffer.concat(chunks))
    })
    req.on('error', (error) => fail(error instanceof Error ? error : new Error('Could not read sign-in')))
  })
}
