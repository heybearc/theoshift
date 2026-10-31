import { prisma } from './prisma'
import { findVolunteerByEmailCaseInsensitive } from './volunteerEmailLookup'

export type MagicLinkFailure = 'InvalidToken' | 'TokenExpired' | 'VolunteerNotFound'

export type ConsumedMagicLink = {
  id: string
  email: string
  firstName: string
  lastName: string
}

export async function consumeMagicLink(
  token: string,
  emailParam: string
): Promise<{ ok: true; volunteer: ConsumedMagicLink } | { ok: false; error: MagicLinkFailure }> {
  const emailTrimmed = emailParam.trim()

  let verificationToken = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier: emailTrimmed,
        token,
      },
    },
  })

  if (!verificationToken) {
    const vol = await findVolunteerByEmailCaseInsensitive(emailTrimmed)
    if (vol) {
      verificationToken = await prisma.verificationToken.findUnique({
        where: {
          identifier_token: {
            identifier: vol.email,
            token,
          },
        },
      })
    }
  }

  if (!verificationToken) {
    return { ok: false, error: 'InvalidToken' }
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token,
        },
      },
    })
    return { ok: false, error: 'TokenExpired' }
  }

  let volunteer = await prisma.volunteers.findUnique({
    where: { email: verificationToken.identifier },
  })
  if (!volunteer) {
    volunteer = await findVolunteerByEmailCaseInsensitive(verificationToken.identifier)
  }

  if (!volunteer) {
    return { ok: false, error: 'VolunteerNotFound' }
  }

  await prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier: verificationToken.identifier,
        token,
      },
    },
  })

  return {
    ok: true,
    volunteer: {
      id: volunteer.id,
      email: volunteer.email,
      firstName: volunteer.firstName,
      lastName: volunteer.lastName,
    },
  }
}
