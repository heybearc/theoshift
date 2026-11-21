import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

interface Volunteer {
  id: string
  name: string
  email: string
  phone?: string
  congregation?: string
  department?: string
}

interface QuickVolunteerLookupProps {
  isOpen: boolean
  onClose: () => void
  eventId?: string
  onSelect?: (volunteer: Volunteer) => void
}

export default function QuickVolunteerLookup({ 
  isOpen, 
  onClose, 
  eventId,
  onSelect 
}: QuickVolunteerLookupProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [filteredVolunteers, setFilteredVolunteers] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentVolunteerSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Fetch volunteers when modal opens
  useEffect(() => {
    if (isOpen && eventId) {
      fetchVolunteers()
      // Focus search input
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen, eventId])

  // Filter volunteers based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredVolunteers(volunteers.slice(0, 20)) // Show first 20
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = volunteers.filter(v => 
      v.name.toLowerCase().includes(query) ||
      v.email.toLowerCase().includes(query) ||
      v.phone?.includes(query) ||
      v.congregation?.toLowerCase().includes(query) ||
      v.department?.toLowerCase().includes(query)
    )
    setFilteredVolunteers(filtered.slice(0, 20))
  }, [searchQuery, volunteers])

  const fetchVolunteers = async () => {
    if (!eventId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/events/${eventId}/volunteers`)
      if (response.ok) {
        const data = await response.json()
        setVolunteers(data.volunteers || [])
      }
    } catch (error) {
      console.error('Error fetching volunteers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (volunteer: Volunteer) => {
    // Save to recent searches
    const newRecent = [volunteer.name, ...recentSearches.filter(s => s !== volunteer.name)].slice(0, 5)
    setRecentSearches(newRecent)
    localStorage.setItem('recentVolunteerSearches', JSON.stringify(newRecent))

    if (onSelect) {
      onSelect(volunteer)
    }
    onClose()
  }

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`
  }

  const clearSearch = () => {
    setSearchQuery('')
    searchInputRef.current?.focus()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Find Volunteer</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <span className="text-gray-500 text-xl">×</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="text-xl">×</span>
              </button>
            )}
          </div>
        </div>

        {/* Recent Searches */}
        {!searchQuery && recentSearches.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Recent Searches</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => setSearchQuery(search)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 active:bg-gray-300"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredVolunteers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <span className="text-4xl mb-2">🔍</span>
              <p className="text-sm">
                {searchQuery ? 'No volunteers found' : 'Start typing to search'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredVolunteers.map((volunteer) => (
                <div
                  key={volunteer.id}
                  className="p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => handleSelect(volunteer)}
                      className="flex-1 text-left"
                    >
                      <h3 className="font-medium text-gray-900">{volunteer.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{volunteer.email}</p>
                      {volunteer.phone && (
                        <p className="text-sm text-gray-500 mt-0.5">{volunteer.phone}</p>
                      )}
                      {volunteer.congregation && (
                        <p className="text-xs text-gray-400 mt-1">{volunteer.congregation}</p>
                      )}
                    </button>

                    {/* Quick Actions */}
                    <div className="flex space-x-2 ml-3">
                      {volunteer.phone && (
                        <button
                          onClick={() => handleCall(volunteer.phone!)}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 active:bg-green-300"
                          aria-label="Call"
                        >
                          📞
                        </button>
                      )}
                      <button
                        onClick={() => handleEmail(volunteer.email)}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 active:bg-blue-300"
                        aria-label="Email"
                      >
                        ✉️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
