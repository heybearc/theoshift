import { useState, useEffect, useRef } from 'react'
import { useLoadScript, Autocomplete } from '@react-google-maps/api'
import MapPreview from './MapPreview'
import { notifyAlert, toast } from '../lib/ui/toast'

const libraries: ("places")[] = ["places"]

interface Location {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
  usageCount: number
  _count?: {
    events: number
  }
}

interface LocationSelectorProps {
  value: string | null // locationId or null for free text
  locationName?: string // For displaying selected location name
  onChange: (locationId: string | null, locationName: string) => void
  onCreateNew?: (location: Omit<Location, 'id' | 'usageCount' | '_count'>) => void
  error?: string
  disabled?: boolean
}

export default function LocationSelector({
  value,
  locationName = '',
  onChange,
  onCreateNew,
  error,
  disabled = false
}: LocationSelectorProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState(locationName)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch locations on mount and when search changes
  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true)
      try {
        const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
        const response = await fetch(`/api/locations${query}`)
        const data = await response.json()
        
        if (data.success) {
          setLocations(data.data)
        }
      } catch (error) {
        console.error('Error fetching locations:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(() => {
      fetchLocations()
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchTerm])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    setShowDropdown(true)
    setSelectedIndex(-1)
    
    // If user is typing, clear the selected location (switch to free text mode)
    if (value) {
      onChange(null, newValue)
    }
  }

  const handleSelectLocation = (location: Location) => {
    setSearchTerm(location.name)
    onChange(location.id, location.name)
    setShowDropdown(false)
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < locations.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < locations.length) {
          handleSelectLocation(locations[selectedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleCreateNew = () => {
    setShowCreateModal(true)
    setShowDropdown(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
          placeholder="Search locations or type new..."
        />
        
        {/* Search Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* Dropdown */}
      {showDropdown && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {locations.length === 0 && !loading ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm mb-2">No locations found</p>
              <button
                type="button"
                onClick={handleCreateNew}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Create "{searchTerm}" as new location
              </button>
            </div>
          ) : (
            <>
              {/* Location List */}
              <div className="py-2">
                {locations.map((location, index) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => handleSelectLocation(location)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      index === selectedIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">📍</span>
                          <p className="font-medium text-gray-900 truncate">
                            {location.name}
                          </p>
                        </div>
                        {location.address && (
                          <p className="text-sm text-gray-600 mt-1 ml-7 truncate">
                            {location.address}
                          </p>
                        )}
                        {location._count && location._count.events > 0 && (
                          <p className="text-xs text-gray-500 mt-1 ml-7">
                            Used in {location._count.events} event{location._count.events !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      {location.latitude && location.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="ml-2 text-blue-600 hover:text-blue-700 text-xs whitespace-nowrap"
                        >
                          View Map
                        </a>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Create New Option */}
              <div className="border-t border-gray-200 p-2">
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="w-full px-4 py-2 text-left text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm font-medium"
                >
                  + Create new location
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Create Location Modal */}
      {showCreateModal && (
        <CreateLocationModal
          initialName={searchTerm}
          onClose={() => setShowCreateModal(false)}
          onSave={(newLocation) => {
            if (onCreateNew) {
              onCreateNew(newLocation)
            }
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}

// Create Location Modal Component
interface CreateLocationModalProps {
  initialName: string
  onClose: () => void
  onSave: (location: Omit<Location, 'id' | 'usageCount' | '_count'>) => void
}

function CreateLocationModal({ initialName, onClose, onSave }: CreateLocationModalProps) {
  const [name, setName] = useState(initialName)
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries
  })

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance)
  }

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace()
      
      if (place.formatted_address) {
        setAddress(place.formatted_address)
      }
      
      if (place.geometry?.location) {
        setLatitude(place.geometry.location.lat())
        setLongitude(place.geometry.location.lng())
      }
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          latitude,
          longitude,
          notes: notes.trim() || null
        })
      })

      const data = await response.json()
      
      if (data.success) {
        onSave(data.data)
      } else {
        notifyAlert('Failed to create location: ' + data.error)
      }
    } catch (error) {
      console.error('Error creating location:', error)
      notifyAlert('Error creating location')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">Create New Location</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Kingdom Hall - Main Auditorium"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            {isLoaded ? (
              <Autocomplete
                onLoad={onLoad}
                onPlaceChanged={onPlaceChanged}
              >
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Start typing an address..."
                />
              </Autocomplete>
            ) : (
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123 Main St, City, State 12345"
              />
            )}
            <p className="mt-1 text-xs text-gray-500">
              {latitude && longitude ? (
                <span className="text-green-600">
                  ✓ Coordinates captured: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
              ) : (
                'Type to search for an address with Google Maps'
              )}
            </p>
          </div>

          {latitude && longitude && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Map Preview
              </label>
              <MapPreview
                latitude={latitude}
                longitude={longitude}
                name={name}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional details, parking info, etc."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Location'}
          </button>
        </div>
      </div>
    </div>
  )
}
