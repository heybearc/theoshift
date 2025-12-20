import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session || session.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized' })
  }

  try {
    // Get list of backups with details from NFS storage
    const { stdout: backupList } = await execAsync(
      'ssh root@10.92.3.21 "ls -lh /mnt/data/theoshift-green-backups/database/automated/db-jw-scheduler-*.sql.gz 2>/dev/null | tail -10"'
    )

    // Parse backup list
    const backups = backupList.trim().split('\n').filter(line => line).map(line => {
      const parts = line.split(/\s+/)
      const size = parts[4]
      const date = `${parts[5]} ${parts[6]} ${parts[7]}`
      const filename = parts[8]
      return { filename, size, date }
    }).reverse() // Most recent first

    // Get last backup time
    const lastBackup = backups.length > 0 ? backups[0] : null

    // Get database sizes
    const { stdout: dbSizes } = await execAsync(
      'ssh root@10.92.3.21 "sudo -u postgres psql -t -c \\"SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database WHERE datname LIKE \'jw_attendant%\' ORDER BY datname;\\""'
    )

    const databases = dbSizes.trim().split('\n').map(line => {
      const [name, size] = line.trim().split('|').map(s => s.trim())
      return { name, size }
    })

    return res.status(200).json({
      success: true,
      backups,
      lastBackup,
      databases,
      backupCount: backups.length
    })
  } catch (error) {
    console.error('Backup info error:', error)
    return res.status(500).json({
      error: 'Failed to get backup information',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
