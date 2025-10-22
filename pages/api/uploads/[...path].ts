import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { path: filePath } = req.query
    
    if (!filePath || !Array.isArray(filePath)) {
      return res.status(400).send('Invalid path')
    }

    // Construct the full file path
    const fullPath = path.join(process.cwd(), 'public', 'uploads', ...filePath)
    
    // Security check: ensure the path is within the uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fullPath.startsWith(uploadsDir)) {
      return res.status(403).send('Forbidden')
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).send('File not found')
    }

    // Get file stats
    const stat = fs.statSync(fullPath)
    
    // Set appropriate headers
    const ext = path.extname(fullPath).toLowerCase()
    const contentTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
    }
    
    const contentType = contentTypes[ext] || 'application/octet-stream'
    
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', stat.size)
    res.setHeader('Cache-Control', 'public, max-age=31536000')
    
    // Stream the file
    const fileStream = fs.createReadStream(fullPath)
    fileStream.pipe(res)
  } catch (error) {
    console.error('File serve error:', error)
    res.status(500).send('Internal server error')
  }
}
