import type { NextApiRequest, NextApiResponse } from 'next'
import packageJson from '../../package.json'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    version: packageJson.version,
    environment: process.env.NODE_ENV,
    buildTime: new Date().toISOString()
  })
}
