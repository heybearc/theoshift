import { NextApiRequest, NextApiResponse } from 'next'

/** Volunteer PIN login is retired. Use magic-link sign-in at /auth/signin. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    success: false,
    error: 'Volunteer PIN login has been removed. Use the email sign-in link at /auth/signin.',
  })
}
