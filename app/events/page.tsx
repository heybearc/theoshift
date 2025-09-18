'use client'

import { useState, useEffect } from 'react'
import { useAuth } from "../providers"
import Link from 'next/link'

interface Event {
  id: string
  name: string
  description: string
  startDate: string
  location: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function EventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [viewMode, setViewMode] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [newEvent, setNewEvent] = useState({
    name: '',
    eventDate: '',
    location: '',
    description: ''
  })

  useEffect(() => {
    if (user) {
      loadEvents()
    }
  }, [viewMode, user])

  const loadEvents = async () => {
    try {
      let endpoint = '/api/events'
      if (viewMode === 'upcoming') {
        endpoint = '/api/events/upcoming'
      } else if (viewMode === 'past') {
        endpoint = '/api/events/past'
      }
      
      const response = await fetch(endpoint)
      const data = await response.json()
      setEvents(data)
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadEvents()
      return
    }

    try {
      const response = await fetch(`/api/events/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      setEvents(data)
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEvent),
      })

      if (response.ok) {
        setNewEvent({ name: '', eventDate: '', location: '', description: '' })
        setShowCreateForm(false)
        loadEvents()
      }
    } catch (error) {
      console.error('Failed to create event:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!user) {
    return <div className="p-8">Please sign in to access this page.</div>
  }

  if (loading) {
    return <div className="p-8">Loading events...</div>
  }

  const canCreateEvents = ['ADMIN', 'OVERSEER'].includes(user.role)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Event Management</h1>
              <p className="text-gray-600 mt-2">Manage congregation events and assignments</p>
            </div>
            <div className="space-x-4">
              <Link
                href="/dashboard"
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Back to Dashboard
              </Link>
              {canCreateEvents && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Create New Event
                </button>
              )}
            </div>
          </div>

          <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {[
                { key: 'upcoming', label: 'Upcoming Events' },
                { key: 'all', label: 'All Events' },
                { key: 'past', label: 'Past Events' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key as any)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    viewMode === key
                      ? 'bg-white text-blue-600 shadow'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 flex gap-4">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
            >
              Search
            </button>
            <button
              onClick={() => {
                setSearchQuery('')
                loadEvents()
              }}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              Clear
            </button>
          </div>

          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Create New Event</h2>
                <form onSubmit={handleCreateEvent}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Event Name</label>
                    <input
                      type="text"
                      required
                      value={newEvent.name}
                      onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., Circuit Assembly"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <input
                      type="datetime-local"
                      required
                      value={newEvent.eventDate}
                      onChange={(e) => setNewEvent({...newEvent, eventDate: e.target.value})}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <input
                      type="text"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., Assembly Hall"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                      className="w-full px-3 py-2 border rounded h-24"
                      placeholder="Event details and notes..."
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                    >
                      Create Event
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 bg-gray-400 text-white py-2 rounded hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid gap-6">
            {events.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-xl mb-2">No events found</p>
                <p>Create your first event to get started</p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="bg-gray-50 p-6 rounded-lg border hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {event.name}
                      </h3>
                      <div className="flex items-center text-gray-600 mb-2">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(event.startDate)}
                      </div>
                      {event.location && (
                        <div className="flex items-center text-gray-600 mb-2">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {event.location}
                        </div>
                      )}
                      {event.description && (
                        <p className="text-gray-700 mt-3">{event.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                        View Details
                      </button>
                      <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                        Manage Assignments
                      </button>
                      <button className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700">
                        Count Times
                      </button>
                    </div>
                  </div>
                  <div className="border-t pt-3 text-sm text-gray-500">
                    <p>Created: {new Date(event.createdAt).toLocaleDateString()}</p>
                    {event.updatedAt !== event.createdAt && (
                      <p>Updated: {new Date(event.updatedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 text-center text-gray-500">
            <p>Total Events: {events.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
