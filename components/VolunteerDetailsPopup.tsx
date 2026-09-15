import React, { useState, useRef, useEffect } from 'react'
import { VolunteerBadges } from './VolunteerBadges'
import { displayPhone } from '@/lib/formatPhone'

interface Volunteer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  congregation: string
  notes?: string | null
  formsOfService: any
  isActive: boolean
  profileVerificationRequired?: boolean
  profileVerifiedAt?: string | null
  overseer?: {
    id: string
    firstName: string
    lastName: string
  } | null
  keyman?: {
    id: string
    firstName: string
    lastName: string
  } | null
  availability?: {
    status: 'AVAILABLE' | 'NOT_AVAILABLE' | 'PARTIAL' | 'PENDING'
    notes: string | null
    respondedAt: string | null
  } | null
  assignments?: Array<{
    positionName: string
    role: string
  }>
}

interface VolunteerDetailsPopupProps {
  volunteer: Volunteer
  children: React.ReactNode
  onEdit?: () => void
}

export default function VolunteerDetailsPopup({ volunteer, children, onEdit }: VolunteerDetailsPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom')
  const triggerRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen && triggerRef.current && popupRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const popupHeight = popupRef.current.offsetHeight
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - triggerRect.bottom
      const spaceAbove = triggerRect.top

      if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
        setPosition('top')
      } else {
        setPosition('bottom')
      }
    }
  }, [isOpen])

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(true)
    }, 300)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 200)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    }
  }, [])

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="cursor-pointer"
      >
        {children}
      </div>

      {isOpen && (
        <div
          ref={popupRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute z-[9999] w-96 bg-white rounded-lg shadow-2xl border border-gray-200 ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          style={{ left: '0' }}
        >
          <div className="p-4 max-h-[500px] overflow-y-auto">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-sm font-semibold text-gray-900">
                {volunteer.firstName} {volunteer.lastName}
              </h4>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {/* Contact Information */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-gray-700 mb-2">Contact</h5>
                <div className="space-y-1.5">
                  <div>
                    <label className="text-xs text-gray-500">Email</label>
                    <p className="text-sm text-gray-900">{volunteer.email}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Phone</label>
                    <p className="text-sm text-gray-900">{displayPhone(volunteer.phone) || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Congregation</label>
                    <p className="text-sm text-gray-900">{volunteer.congregation}</p>
                  </div>
                  {volunteer.notes?.trim() && (
                    <div>
                      <label className="text-xs text-gray-500">Notes</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{volunteer.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-gray-700 mb-2">Status</h5>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    volunteer.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {volunteer.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {volunteer.profileVerifiedAt ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Verified
                    </span>
                  ) : volunteer.profileVerificationRequired ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Verification Required
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Forms of Service */}
              {volunteer.formsOfService && Array.isArray(volunteer.formsOfService) && volunteer.formsOfService.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">Forms of Service</h5>
                  <div className="flex flex-wrap gap-1">
                    {volunteer.formsOfService.map((service: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignments */}
              {volunteer.assignments && volunteer.assignments.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">Assignments</h5>
                  <div className="space-y-1">
                    {volunteer.assignments.map((assignment, idx) => (
                      <div key={idx} className="text-xs text-gray-700">
                        <span className="font-medium">{assignment.positionName}</span>
                        {assignment.role !== 'VOLUNTEER' && (
                          <span className="ml-1 text-gray-500">({assignment.role})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Oversight */}
              {(volunteer.overseer || volunteer.keyman) && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">Oversight</h5>
                  <div className="space-y-1.5">
                    {volunteer.overseer && (
                      <div>
                        <label className="text-xs text-gray-500">Overseer</label>
                        <p className="text-sm text-gray-900">
                          {volunteer.overseer.firstName} {volunteer.overseer.lastName}
                        </p>
                      </div>
                    )}
                    {volunteer.keyman && (
                      <div>
                        <label className="text-xs text-gray-500">Keyman</label>
                        <p className="text-sm text-gray-900">
                          {volunteer.keyman.firstName} {volunteer.keyman.lastName}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Availability */}
              {volunteer.availability && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">Availability</h5>
                  <div className="space-y-1.5">
                    <div>
                      <label className="text-xs text-gray-500">Status</label>
                      <p className="text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          volunteer.availability.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                          volunteer.availability.status === 'NOT_AVAILABLE' ? 'bg-red-100 text-red-800' :
                          volunteer.availability.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {volunteer.availability.status.replace('_', ' ')}
                        </span>
                      </p>
                    </div>
                    {volunteer.availability.notes && (
                      <div>
                        <label className="text-xs text-gray-500">Notes</label>
                        <p className="text-sm text-gray-900">{volunteer.availability.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              {onEdit && (
                <div className="pt-2 border-t">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsOpen(false)
                      onEdit()
                    }}
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Edit Volunteer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
