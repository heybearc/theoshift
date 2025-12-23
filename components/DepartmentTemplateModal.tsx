import { useState, useEffect } from 'react'
import { 
  CustomField, 
  ModuleConfig, 
  Terminology, 
  PositionTemplate,
  DEFAULT_ATTENDANTS_CONFIG,
  DEFAULT_BAPTISM_CONFIG,
  DEFAULT_PARKING_CONFIG
} from '../types/departmentTemplate'

interface DepartmentTemplate {
  id: string
  name: string
  description: string | null
  parentId: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
  moduleConfig?: ModuleConfig | null
  terminology?: Terminology | null
  positionTemplates?: PositionTemplate[] | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  department: DepartmentTemplate | null
  allDepartments: DepartmentTemplate[]
}

type TabType = 'basic' | 'modules' | 'fields' | 'terminology' | 'positions'

export default function DepartmentTemplateModal({ isOpen, onClose, onSave, department, allDepartments }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Basic info state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  const [icon, setIcon] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)

  // Module config state
  const [moduleConfig, setModuleConfig] = useState<ModuleConfig>({
    countTimes: false,
    lanyards: false,
    positions: true,
    customFields: []
  })

  // Terminology state
  const [terminology, setTerminology] = useState<Terminology>({
    volunteer: 'Volunteer',
    position: 'Position',
    shift: 'Shift',
    assignment: 'Assignment'
  })

  // Position templates state
  const [positionTemplates, setPositionTemplates] = useState<PositionTemplate[]>([])

  useEffect(() => {
    if (department) {
      setName(department.name)
      setDescription(department.description || '')
      setParentId(department.parentId || '')
      setIcon(department.icon || '')
      setSortOrder(department.sortOrder)
      setIsActive(department.isActive)
      
      if (department.moduleConfig) {
        setModuleConfig(department.moduleConfig as ModuleConfig)
      }
      if (department.terminology) {
        setTerminology(department.terminology as Terminology)
      }
      if (department.positionTemplates) {
        setPositionTemplates(department.positionTemplates as PositionTemplate[])
      }
    } else {
      resetForm()
    }
  }, [department])

  const resetForm = () => {
    setName('')
    setDescription('')
    setParentId('')
    setIcon('')
    setSortOrder(0)
    setIsActive(true)
    setModuleConfig({
      countTimes: false,
      lanyards: false,
      positions: true,
      customFields: []
    })
    setTerminology({
      volunteer: 'Volunteer',
      position: 'Position',
      shift: 'Shift',
      assignment: 'Assignment'
    })
    setPositionTemplates([])
    setActiveTab('basic')
  }

  const loadPreset = (presetName: 'attendants' | 'baptism' | 'parking') => {
    let config
    switch (presetName) {
      case 'attendants':
        config = DEFAULT_ATTENDANTS_CONFIG
        break
      case 'baptism':
        config = DEFAULT_BAPTISM_CONFIG
        break
      case 'parking':
        config = DEFAULT_PARKING_CONFIG
        break
    }
    
    if (config.moduleConfig) setModuleConfig(config.moduleConfig)
    if (config.terminology) setTerminology(config.terminology)
    if (config.positionTemplates) setPositionTemplates(config.positionTemplates)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      await onSave({
        name,
        description,
        parentId: parentId || null,
        icon,
        sortOrder,
        isActive,
        moduleConfig,
        terminology,
        positionTemplates
      })
      resetForm()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save department template')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const tabs = [
    { id: 'basic' as TabType, label: 'Basic Info', icon: '📋' },
    { id: 'modules' as TabType, label: 'Modules', icon: '🔧' },
    { id: 'fields' as TabType, label: 'Custom Fields', icon: '📝' },
    { id: 'terminology' as TabType, label: 'Terminology', icon: '💬' },
    { id: 'positions' as TabType, label: 'Position Templates', icon: '📍' }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {department ? 'Edit Department Template' : 'Create Department Template'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                {error}
              </div>
            )}

            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <BasicInfoTab
                name={name}
                setName={setName}
                description={description}
                setDescription={setDescription}
                parentId={parentId}
                setParentId={setParentId}
                icon={icon}
                setIcon={setIcon}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                isActive={isActive}
                setIsActive={setIsActive}
                allDepartments={allDepartments}
                currentDeptId={department?.id}
              />
            )}

            {/* Modules Tab */}
            {activeTab === 'modules' && (
              <ModulesTab
                moduleConfig={moduleConfig}
                setModuleConfig={setModuleConfig}
                loadPreset={loadPreset}
              />
            )}

            {/* Custom Fields Tab */}
            {activeTab === 'fields' && (
              <CustomFieldsTab
                customFields={moduleConfig.customFields}
                setCustomFields={(fields) => setModuleConfig({ ...moduleConfig, customFields: fields })}
              />
            )}

            {/* Terminology Tab */}
            {activeTab === 'terminology' && (
              <TerminologyTab
                terminology={terminology}
                setTerminology={setTerminology}
              />
            )}

            {/* Position Templates Tab */}
            {activeTab === 'positions' && (
              <PositionTemplatesTab
                positionTemplates={positionTemplates}
                setPositionTemplates={setPositionTemplates}
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {activeTab !== 'basic' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabIndex = tabs.findIndex(t => t.id === activeTab)
                    if (tabIndex > 0) setActiveTab(tabs[tabIndex - 1].id)
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  ← Previous
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              {activeTab !== 'positions' ? (
                <button
                  type="button"
                  onClick={() => {
                    const tabIndex = tabs.findIndex(t => t.id === activeTab)
                    if (tabIndex < tabs.length - 1) setActiveTab(tabs[tabIndex + 1].id)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving || !name}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : (department ? 'Update Template' : 'Create Template')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// Basic Info Tab Component
function BasicInfoTab({ 
  name, setName, description, setDescription, parentId, setParentId, 
  icon, setIcon, sortOrder, setSortOrder, isActive, setIsActive,
  allDepartments, currentDeptId
}: any) {
  const availableParents = allDepartments.filter((d: any) => d.id !== currentDeptId)

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Department Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Attendants, Baptism, Parking"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Brief description of this department"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Icon (Emoji)
          </label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 👔 🚗 💧"
            maxLength={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort Order
          </label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Parent Department (Optional)
        </label>
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">None (Top Level)</option>
          {availableParents.map((dept: any) => (
            <option key={dept.id} value={dept.id}>
              {dept.icon} {dept.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
          Active (available for use in events)
        </label>
      </div>
    </div>
  )
}

// Modules Tab Component
function ModulesTab({ moduleConfig, setModuleConfig, loadPreset }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📦 Quick Presets</h3>
        <p className="text-sm text-blue-700 mb-3">
          Load a pre-configured template to get started quickly
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadPreset('attendants')}
            className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
          >
            👔 Attendants
          </button>
          <button
            type="button"
            onClick={() => loadPreset('baptism')}
            className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
          >
            💧 Baptism
          </button>
          <button
            type="button"
            onClick={() => loadPreset('parking')}
            className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
          >
            🚗 Parking
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Enable Modules</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select which features should be available for events using this department template
        </p>

        <div className="space-y-4">
          <ModuleToggle
            id="countTimes"
            label="Count Times"
            description="Track attendance counts at specific times during the event"
            icon="📊"
            enabled={moduleConfig.countTimes}
            onChange={(enabled) => setModuleConfig({ ...moduleConfig, countTimes: enabled })}
          />

          <ModuleToggle
            id="lanyards"
            label="Lanyard Management"
            description="Track badge/lanyard assignments and returns"
            icon="🏷️"
            enabled={moduleConfig.lanyards}
            onChange={(enabled) => setModuleConfig({ ...moduleConfig, lanyards: enabled })}
          />

          <ModuleToggle
            id="positions"
            label="Position Management"
            description="Assign volunteers to specific positions/roles (always enabled)"
            icon="📍"
            enabled={true}
            onChange={() => {}}
            disabled={true}
          />
        </div>
      </div>
    </div>
  )
}

function ModuleToggle({ id, label, description, icon, enabled, onChange, disabled }: any) {
  return (
    <div className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
      <div className="flex-shrink-0 text-3xl mr-4">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">{label}</h4>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
          </label>
        </div>
      </div>
    </div>
  )
}

// Custom Fields Tab Component
function CustomFieldsTab({ customFields, setCustomFields }: any) {
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [showFieldModal, setShowFieldModal] = useState(false)

  const addField = () => {
    setEditingField(null)
    setShowFieldModal(true)
  }

  const editField = (field: CustomField) => {
    setEditingField(field)
    setShowFieldModal(true)
  }

  const deleteField = (fieldId: string) => {
    if (confirm('Are you sure you want to delete this custom field?')) {
      setCustomFields(customFields.filter((f: CustomField) => f.id !== fieldId))
    }
  }

  const saveField = (field: CustomField) => {
    if (editingField) {
      setCustomFields(customFields.map((f: CustomField) => f.id === field.id ? field : f))
    } else {
      setCustomFields([...customFields, { ...field, id: `field_${Date.now()}` }])
    }
    setShowFieldModal(false)
  }

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...customFields]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex >= 0 && newIndex < newFields.length) {
      [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]]
      setCustomFields(newFields)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Custom Fields</h3>
          <p className="text-sm text-gray-600 mt-1">
            Add department-specific data fields for volunteers or events
          </p>
        </div>
        <button
          type="button"
          onClick={addField}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Field
        </button>
      </div>

      {customFields.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-2">No custom fields defined</p>
          <p className="text-sm text-gray-500">Click "Add Field" to create department-specific data fields</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customFields.map((field: CustomField, index: number) => (
            <div key={field.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => moveField(index, 'up')}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveField(index, 'down')}
                  disabled={index === customFields.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{field.label}</span>
                  {field.required && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>}
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{field.type}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Field name: {field.name}</p>
                {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => editField(field)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteField(field.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showFieldModal && (
        <CustomFieldModal
          field={editingField}
          onSave={saveField}
          onClose={() => setShowFieldModal(false)}
        />
      )}
    </div>
  )
}

// Custom Field Modal
function CustomFieldModal({ field, onSave, onClose }: any) {
  const [name, setName] = useState(field?.name || '')
  const [label, setLabel] = useState(field?.label || '')
  const [type, setType] = useState(field?.type || 'text')
  const [required, setRequired] = useState(field?.required || false)
  const [placeholder, setPlaceholder] = useState(field?.placeholder || '')
  const [helpText, setHelpText] = useState(field?.helpText || '')
  const [options, setOptions] = useState(field?.options?.join('\n') || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const fieldData: CustomField = {
      id: field?.id || '',
      name: name.trim(),
      label: label.trim(),
      type,
      required,
      placeholder: placeholder.trim(),
      helpText: helpText.trim()
    }

    if (type === 'select' || type === 'multiselect') {
      fieldData.options = options.split('\n').map(o => o.trim()).filter(o => o)
    }

    onSave(fieldData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {field ? 'Edit Custom Field' : 'Add Custom Field'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Badge Number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Name (code) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., badgeNumber"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Letters, numbers, underscore only</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Field Type <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="text">Text (single line)</option>
              <option value="textarea">Text Area (multi-line)</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="select">Dropdown (single select)</option>
              <option value="multiselect">Multi-Select</option>
            </select>
          </div>

          {(type === 'select' || type === 'multiselect') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options (one per line) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Placeholder Text
            </label>
            <input
              type="text"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Enter badge number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Help Text
            </label>
            <input
              type="text"
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Additional instructions for this field"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="required" className="ml-2 block text-sm text-gray-700">
              Required field
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {field ? 'Update Field' : 'Add Field'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Terminology Tab Component
function TerminologyTab({ terminology, setTerminology }: any) {
  const updateTerm = (key: string, value: string) => {
    setTerminology({ ...terminology, [key]: value })
  }

  const resetToDefaults = () => {
    setTerminology({
      volunteer: 'Volunteer',
      position: 'Position',
      shift: 'Shift',
      assignment: 'Assignment'
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Custom Terminology</h3>
        <p className="text-sm text-gray-600 mb-4">
          Customize the labels used throughout the system for this department. Leave blank to use default terms.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 mb-1">Why customize terminology?</h4>
            <p className="text-sm text-blue-700">
              Different departments use different terms. For example, Attendants use "Post" instead of "Position", 
              while Parking uses "Station". Customize these to match your department's language.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <TerminologyField
          label="Volunteer"
          description='What do you call people in this department? (e.g., "Attendant", "Assistant", "Coordinator")'
          value={terminology.volunteer || ''}
          onChange={(value) => updateTerm('volunteer', value)}
          placeholder="Volunteer"
          example='Attendants: "Attendant" | Baptism: "Baptism Assistant"'
        />

        <TerminologyField
          label="Position"
          description='What do you call work positions? (e.g., "Post", "Station", "Role")'
          value={terminology.position || ''}
          onChange={(value) => updateTerm('position', value)}
          placeholder="Position"
          example='Attendants: "Post" | Parking: "Station" | Baptism: "Role"'
        />

        <TerminologyField
          label="Shift"
          description='What do you call time periods? (e.g., "Rotation", "Time Slot", "Session")'
          value={terminology.shift || ''}
          onChange={(value) => updateTerm('shift', value)}
          placeholder="Shift"
          example='Attendants: "Rotation" | Baptism: "Time Slot"'
        />

        <TerminologyField
          label="Assignment"
          description='What do you call work assignments? (e.g., "Assignment", "Duty", "Task")'
          value={terminology.assignment || ''}
          onChange={(value) => updateTerm('assignment', value)}
          placeholder="Assignment"
          example='Most departments: "Assignment"'
        />
      </div>

      <div className="pt-4 border-t">
        <button
          type="button"
          onClick={resetToDefaults}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ↺ Reset to defaults
        </button>
      </div>
    </div>
  )
}

function TerminologyField({ label, description, value, onChange, placeholder, example }: any) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <label className="block font-medium text-gray-900 mb-1">{label}</label>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={placeholder}
      />
      <p className="text-xs text-gray-500 mt-2">
        <strong>Examples:</strong> {example}
      </p>
    </div>
  )
}

// Position Templates Tab Component
function PositionTemplatesTab({ positionTemplates, setPositionTemplates }: any) {
  const [editingPosition, setEditingPosition] = useState<PositionTemplate | null>(null)
  const [showPositionModal, setShowPositionModal] = useState(false)

  const addPosition = () => {
    setEditingPosition(null)
    setShowPositionModal(true)
  }

  const editPosition = (position: PositionTemplate) => {
    setEditingPosition(position)
    setShowPositionModal(true)
  }

  const deletePosition = (positionId: string) => {
    if (confirm('Are you sure you want to delete this position template?')) {
      setPositionTemplates(positionTemplates.filter((p: PositionTemplate) => p.id !== positionId))
    }
  }

  const savePosition = (position: PositionTemplate) => {
    if (editingPosition) {
      setPositionTemplates(positionTemplates.map((p: PositionTemplate) => p.id === position.id ? position : p))
    } else {
      const newPosition = { ...position, id: `pos_${Date.now()}` }
      setPositionTemplates([...positionTemplates, newPosition])
    }
    setShowPositionModal(false)
  }

  const movePosition = (index: number, direction: 'up' | 'down') => {
    const newPositions = [...positionTemplates]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex >= 0 && newIndex < newPositions.length) {
      [newPositions[index], newPositions[newIndex]] = [newPositions[newIndex], newPositions[index]]
      // Update sortOrder
      newPositions.forEach((p, i) => p.sortOrder = i + 1)
      setPositionTemplates(newPositions)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Position Templates</h3>
          <p className="text-sm text-gray-600 mt-1">
            Pre-configure common positions for quick event setup
          </p>
        </div>
        <button
          type="button"
          onClick={addPosition}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Position
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📍</span>
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 mb-1">Position Templates</h4>
            <p className="text-sm text-blue-700">
              When creating a new event with this department, these positions will be available to add with one click. 
              This saves time by not having to manually create common positions every time.
            </p>
          </div>
        </div>
      </div>

      {positionTemplates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-2">No position templates defined</p>
          <p className="text-sm text-gray-500">Click "Add Position" to create reusable position templates</p>
        </div>
      ) : (
        <div className="space-y-2">
          {positionTemplates
            .sort((a: PositionTemplate, b: PositionTemplate) => a.sortOrder - b.sortOrder)
            .map((position: PositionTemplate, index: number) => (
              <div key={position.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => movePosition(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => movePosition(index, 'down')}
                    disabled={index === positionTemplates.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{position.name}</span>
                    {position.capacity && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        Capacity: {position.capacity}
                      </span>
                    )}
                  </div>
                  {position.description && (
                    <p className="text-sm text-gray-600 mt-1">{position.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => editPosition(position)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePosition(position.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {showPositionModal && (
        <PositionTemplateModal
          position={editingPosition}
          onSave={savePosition}
          onClose={() => setShowPositionModal(false)}
        />
      )}
    </div>
  )
}

// Position Template Modal
function PositionTemplateModal({ position, onSave, onClose }: any) {
  const [name, setName] = useState(position?.name || '')
  const [description, setDescription] = useState(position?.description || '')
  const [capacity, setCapacity] = useState(position?.capacity || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const positionData: PositionTemplate = {
      id: position?.id || '',
      name: name.trim(),
      description: description.trim(),
      capacity: capacity ? parseInt(capacity) : undefined,
      sortOrder: position?.sortOrder || 999
    }

    onSave(positionData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {position ? 'Edit Position Template' : 'Add Position Template'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Main Entrance, Pool Assistant"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of this position"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Capacity
            </label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Number of volunteers needed"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              How many volunteers are typically needed for this position?
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {position ? 'Update Position' : 'Add Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
