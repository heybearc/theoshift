import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../src/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const user = await prisma.users.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true }
  })

  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Admin access required' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Template ID is required' })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, id)
      case 'PUT':
        return await handlePut(req, res, id)
      case 'DELETE':
        return await handleDelete(req, res, id)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Department template API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, id: string) {
  const template = await prisma.department_templates.findUnique({
    where: { id },
    include: {
      parent: {
        select: {
          id: true,
          name: true
        }
      },
      children: {
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          sortOrder: true,
          isActive: true
        },
        orderBy: { sortOrder: 'asc' }
      },
      event_departments: {
        select: {
          id: true,
          eventId: true,
          name: true,
          event: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })

  if (!template) {
    return res.status(404).json({ success: false, error: 'Template not found' })
  }

  return res.status(200).json({
    success: true,
    data: template
  })
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { 
    name, 
    description, 
    parentId, 
    icon, 
    sortOrder, 
    isActive,
    moduleConfig,
    terminology,
    positionTemplates
  } = req.body

  const existing = await prisma.department_templates.findUnique({
    where: { id }
  })

  if (!existing) {
    return res.status(404).json({ success: false, error: 'Template not found' })
  }

  if (name && name !== existing.name) {
    const duplicate = await prisma.department_templates.findUnique({
      where: { name }
    })

    if (duplicate) {
      return res.status(400).json({ success: false, error: 'Department name already exists' })
    }
  }

  const template = await prisma.department_templates.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(parentId !== undefined && { parentId }),
      ...(icon !== undefined && { icon }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive }),
      // Phase 3: Configuration fields
      ...(moduleConfig !== undefined && { moduleConfig }),
      ...(terminology !== undefined && { terminology }),
      ...(positionTemplates !== undefined && { positionTemplates })
    },
    include: {
      parent: {
        select: {
          id: true,
          name: true
        }
      },
      children: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  return res.status(200).json({
    success: true,
    data: template
  })
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, id: string) {
  const template = await prisma.department_templates.findUnique({
    where: { id },
    include: {
      event_departments: {
        select: { id: true }
      },
      children: {
        select: { id: true }
      }
    }
  })

  if (!template) {
    return res.status(404).json({ success: false, error: 'Template not found' })
  }

  if (template.event_departments.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete template that is used in events. Deactivate it instead.'
    })
  }

  if (template.children.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete template that has child departments'
    })
  }

  await prisma.department_templates.delete({
    where: { id }
  })

  return res.status(200).json({
    success: true,
    message: 'Template deleted successfully'
  })
}
