'use client';

import { useState, useEffect } from 'react';

interface CountSession {
  id: string;
  sessionName: string;
  eventId: string;
  countTime: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  events?: {
    id: string;
    name: string;
    startDate: string;
    location: string;
  };
}

export default function CountsPage() {
  const [countSessions, setCountSessions] = useState<CountSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [newCountSession, setNewCountSession] = useState({
    eventId: '',
    sessionName: '',
    countTime: '',
    notes: ''
  });

  useEffect(() => {
    loadCountSessions();
    loadEvents();
    loadAnalytics();
  }, []);

  const loadCountSessions = async () => {
    try {
      const response = await fetch('/api/counts');
      const data = await response.json();
      setCountSessions(data);
    } catch (error) {
      console.error('Failed to load count sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/counts/analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadCountSessions();
      return;
    }

    try {
      const response = await fetch(`/api/counts/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setCountSessions(data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleCreateCountSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/counts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCountSession,
          eventId: parseInt(newCountSession.eventId),
          countTime: new Date(newCountSession.countTime).toISOString()
        }),
      });

      if (response.ok) {
        setNewCountSession({ eventId: '', sessionName: '', countTime: '', notes: '' });
        setShowCreateForm(false);
        loadCountSessions();
        loadAnalytics();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create count session');
      }
    } catch (error) {
      console.error('Failed to create count session:', error);
      alert('Failed to create count session');
    }
  };

  const generateSessionName = async () => {
    if (!newCountSession.eventId) {
      alert('Please select an event first');
      return;
    }

    try {
      const response = await fetch(`/api/counts/generate-name?eventId=${newCountSession.eventId}`);
      const data = await response.json();
      setNewCountSession({...newCountSession, sessionName: data.sessionName});
    } catch (error) {
      console.error('Failed to generate session name:', error);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
        <p className="text-yellow-700">
          <strong>Next.js Staging Environment</strong> - Count tracking with SDD architecture
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Count Tracking</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Add Count Session
        </button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-500">Total Sessions</h3>
            <p className="text-2xl font-bold text-gray-900">{analytics.totalSessions}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-500">Active Sessions</h3>
            <p className="text-2xl font-bold text-green-600">{analytics.activeSessions}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-500">Avg per Event</h3>
            <p className="text-2xl font-bold text-blue-600">{analytics.averageSessionsPerEvent}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-500">Most Active Event</h3>
            <p className="text-sm font-bold text-purple-600">
              {analytics.mostActiveEvent ? analytics.mostActiveEvent.eventName : 'None'}
            </p>
            {analytics.mostActiveEvent && (
              <p className="text-xs text-gray-500">{analytics.mostActiveEvent.sessionCount} sessions</p>
            )}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search count sessions..."
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
            setSearchQuery('');
            loadCountSessions();
          }}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Clear
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Count Session</h2>
            <form onSubmit={handleCreateCountSession}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Event</label>
                <select
                  required
                  value={newCountSession.eventId}
                  onChange={(e) => setNewCountSession({...newCountSession, eventId: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Select an event</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name} - {new Date(event.date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Session Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newCountSession.sessionName}
                    onChange={(e) => setNewCountSession({...newCountSession, sessionName: e.target.value})}
                    className="flex-1 px-3 py-2 border rounded"
                    placeholder="e.g., Morning Session"
                  />
                  <button
                    type="button"
                    onClick={generateSessionName}
                    className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
                  >
                    Auto
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Count Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newCountSession.countTime}
                  onChange={(e) => setNewCountSession({...newCountSession, countTime: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={newCountSession.notes}
                  onChange={(e) => setNewCountSession({...newCountSession, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded h-20"
                  placeholder="Optional notes about this count session..."
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
                >
                  Create Session
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

      {/* Count Sessions List */}
      <div className="grid gap-4">
        {countSessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl mb-2">No count sessions found</p>
            <p>Add your first count session to get started</p>
          </div>
        ) : (
          countSessions.map((session) => (
            <div key={session.id} className="bg-white p-6 rounded-lg shadow border hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {session.sessionName}
                  </h3>
                  <div className="flex items-center text-gray-600 mb-2">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {session.events?.name}
                  </div>
                  <div className="flex items-center text-gray-600 mb-2">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDateTime(session.countTime.toString())}
                  </div>
                  {session.events?.location && (
                    <div className="flex items-center text-gray-600 mb-2">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {session.events?.location}
                    </div>
                  )}
                  {session.notes && (
                    <p className="text-gray-700 mt-3 italic">{session.notes}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <span className={`px-2 py-1 rounded text-sm ${
                    session.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {session.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700">
                    View Report
                  </button>
                </div>
              </div>
              <div className="border-t pt-3 mt-4 text-sm text-gray-500">
                <p>Created: {new Date(session.createdAt).toLocaleDateString()}</p>
                <p>Event Date: {new Date(session.events?.startDate).toLocaleDateString()}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 text-center text-gray-500">
        <p>Total Count Sessions: {countSessions.length}</p>
        <p className="text-sm">Using SDD Count Tracking Library</p>
      </div>
    </div>
  );
}
