import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session || session.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized' })
  }

  try {
    // Trigger the backup script on the database server
    const { stdout, stderr } = await execAsync(
      'ssh root@10.92.3.21 "/usr/local/bin/backup-jw-scheduler.sh"'
    )

    // Get list of recent backups from NFS storage
    const { stdout: backupList } = await execAsync(
      'ssh root@10.92.3.21 "ls -lh /mnt/data/theoshift-green-backups/database/automated/db-jw-scheduler-*.sql.gz | tail -10"'
    )

    return res.status(200).json({
      success: true,
      message: 'Backup completed successfully',
      output: stdout,
      backups: backupList
    })
  } catch (error) {
    console.error('Backup error:', error)
    return res.status(500).json({
      error: 'Backup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
