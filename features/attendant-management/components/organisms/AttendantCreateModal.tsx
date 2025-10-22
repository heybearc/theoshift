import React, { useState, useEffect } from 'react'
import { AttendantModalProps, AttendantCreateInput } from '../../types'
import { FormOfService } from '../../types'
import ActionButton from '../atoms/ActionButton'
import FormsOfServiceSelect from '../../../../components/FormsOfServiceSelect'

export default function AttendantCreateModal({
  isOpen,
  onClose,
  onSave,
  attendant = null,
  loading = false
}: AttendantModalProps) {
  const [formData, setFormData] = useState<AttendantCreateInput>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    congregation: '',
    formsOfService: [],
    isActive: true,
    notes: ''
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Reset form when modal opens/closes or attendant changes
  useEffect(() => {
    if (isOpen) {
      if (attendant) {
        setFormData({
          firstName: attendant.firstName,
          lastName: attendant.lastName,
          email: attendant.email,
          phone: attendant.phone || '',
          congregation: attendant.congregation,
          formsOfService: attendant.formsOfService,
          isActive: attendant.isActive,
          notes: attendant.notes || '',
          userId: attendant.userId || undefined
        })
      } else {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          congregation: '',
          formsOfService: [],
          isActive: true,
          notes: ''
        })
      }
      setErrors({})
    }
  }, [isOpen, attendant])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.congregation.trim()) {
      newErrors.congregation = 'Congregation is required'
    }

    if (formData.formsOfService.length === 0) {
      newErrors.formsOfService = 'At least one form of service is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setSaving(true)
      await onSave(formData)
      onClose()
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof AttendantCreateInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 xl:w-2/5 shadow-lg rounded-md bg-white">
        <form onSubmit={handleSubmit}>
          <div className="mt-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {attendant ? 'Edit Attendant' : 'Create New Attendant'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={saving}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.firstName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={saving}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.lastName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Contact Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={saving}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={saving}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              {/* Congregation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Congregation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.congregation}
                  onChange={(e) => handleInputChange('congregation', e.target.value)}
                  disabled={saving}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.congregation ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter congregation name"
                />
                {errors.congregation && (
                  <p className="mt-1 text-sm text-red-600">{errors.congregation}</p>
                )}
              </div>

              {/* Forms of Service */}
              <div>
                <FormsOfServiceSelect
                  selectedForms={formData.formsOfService}
                  onChange={(forms) => handleInputChange('formsOfService', forms)}
                  disabled={saving}
                  required
                />
                {errors.formsOfService && (
                  <p className="mt-1 text-sm text-red-600">{errors.formsOfService}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    disabled={saving}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Active (available for assignments)
                  </span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  disabled={saving}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes about this attendant"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <ActionButton
                onClick={onClose}
                variant="secondary"
                disabled={saving}
              >
                Cancel
              </ActionButton>
              <ActionButton
                onClick={() => {}}
                type="submit"
                variant="primary"
                loading={saving}
                disabled={saving}
              >
                {attendant ? 'Update Attendant' : 'Create Attendant'}
              </ActionButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
