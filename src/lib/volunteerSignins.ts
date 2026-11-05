import type { NextApiRequest, NextApiResponse } from 'next'
import { serialize } from 'cookie'
import { encode } from 'next-auth/jwt'
import { prisma } from './prisma'
import { signMobileToken, VOLUNTEER_SESSION_SECONDS } from './mobileSession'
import { normalizeSigninPlatform, platformLabel, signinIsActive } from './signinAccess'
import { sessionTokenCookieName, useSecureCookies } from './nextAuthCookieHelpers'

const LAST_SEEN_GAP_MS = 15 * 60 * 1000

export type VolunteerSessionPerson = {
  id: string
  email: string
  firstName: string
  lastName: string
  congregation: string
}

export async function volunteerAccessAllows(
  volunteerId: string,
  sid: string | null,
  iat: number | undefined
): Promise<boolean> {
  try {
    const volunteer = await prisma.volunteers.findUnique({
      where: { id: volunteerId },
      select: { sessionValidAfter: true, isActive: true },
    })
    if (!volunteer) return false
    const row = sid
      ? await prisma.volunteer_signins.findUnique({
          where: { id: sid },
          select: { volunteerId: true, revokedAt: true, expiresAt: true, lastSeenAt: true },
        })
      : null
    const allowed = signinIsActive({
      volunteerId,
      sid,
      iat,
      sessionValidAfter: volunteer.sessionValidAfter,
      isActive: volunteer.isActive,
      row,
    })
    if (allowed && row && Date.now() - row.lastSeenAt.getTime() > LAST_SEEN_GAP_MS) {
      void prisma.volunteer_signins
        .update({ where: { id: sid! }, data: { lastSeenAt: new Date() } })
        .catch(() => undefined)
    }
    return allowed
  } catch (error) {
    console.error('Volunteer sign-in check failed', error)
    return true
  }
}

export async function createVolunteerSignin(volunteerId: string, platform: unknown) {
  const now = new Date()
  return prisma.volunteer_signins.create({
    data: {
      volunteerId,
      platform: normalizeSigninPlatform(platform),
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + VOLUNTEER_SESSION_SECONDS * 1000),
    },
  })
}

export async function listVolunteerSignins(volunteerId: string, currentId: string | null) {
  const rows = await prisma.volunteer_signins.findMany({
    where: { volunteerId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((row) => ({
    id: row.id,
    platform: row.platform,
    label: platformLabel(row.platform),
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    current: row.id === currentId,
  }))
}

export async function revokeVolunteerSignin(volunteerId: string, id: string) {
  const row = await prisma.volunteer_signins.findUnique({ where: { id } })
  if (!row || row.volunteerId !== volunteerId || row.revokedAt) return false
  await prisma.volunteer_signins.update({
    where: { id },
    data: { revokedAt: new Date() },
  })
  return true
}

export async function revokeCurrentOrLegacy(volunteerId: string, sid: string | null) {
  if (sid) {
    await revokeVolunteerSignin(volunteerId, sid)
    return
  }
  await prisma.volunteers.update({
    where: { id: volunteerId },
    data: { sessionValidAfter: new Date(), updatedAt: new Date() },
  })
}

/** Ends every other sign-in, including ones from before phones could be listed, and keeps this device. */
export async function revokeOtherVolunteerSignins(volunteerId: string, platform: unknown) {
  const now = new Date()
  const floor = new Date(now.getTime() - 2000)
  return prisma.$transaction(async (tx) => {
    await tx.volunteers.update({
      where: { id: volunteerId },
      data: { sessionValidAfter: floor, updatedAt: now },
    })
    await tx.volunteer_signins.updateMany({
      where: { volunteerId, revokedAt: null },
      data: { revokedAt: now },
    })
    return tx.volunteer_signins.create({
      data: {
        volunteerId,
        platform: normalizeSigninPlatform(platform),
        createdAt: now,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + VOLUNTEER_SESSION_SECONDS * 1000),
      },
    })
  })
}

export function mobileAccessToken(volunteer: VolunteerSessionPerson, sid: string) {
  return signMobileToken(volunteer, sid)
}

export async function writeVolunteerSessionCookie(
  req: NextApiRequest,
  res: NextApiResponse,
  volunteer: VolunteerSessionPerson,
  sid: string
) {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET not configured')

  const token = await encode({
    token: {
      sub: volunteer.id,
      userId: volunteer.id,
      email: volunteer.email,
      name: `${volunteer.firstName} ${volunteer.lastName}`.trim(),
      role: 'VOLUNTEER',
      congregation: volunteer.congregation,
      sid,
    },
    secret,
    maxAge: VOLUNTEER_SESSION_SECONDS,
  })

  const secure = useSecureCookies(req)
  res.setHeader(
    'Set-Cookie',
    serialize(sessionTokenCookieName(req), token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: VOLUNTEER_SESSION_SECONDS,
    })
  )
}
