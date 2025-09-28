'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Event {
  id: number;
  title: string;
  description?: string;
  event_type: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time?: string;
  location: string;
  capacity?: number;
  attendants_needed?: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  created_at: string;
  created_by_name?: string;
  assigned_attendants: number;
}

interface EventsResponse {
  success: boolean;
  data: {
    events: Event[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  error?: string;
}

const EVENT_TYPE_LABELS = {
  assembly: 'Circuit Assembly',
  convention: 'Regional Convention',
  circuit_overseer_visit: 'Circuit Overseer Visit',
  special_event: 'Special Event',
  meeting: 'Meeting',
  memorial: 'Memorial',
  other: 'Other'
};

const STATUS_LABELS = {
  draft: 'Draft',
  published: 'Published',
  cancelled: 'Cancelled',
  completed: 'Completed'
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800'
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Filters
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [status, setStatus] = useState('');

  const fetchEvents = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(eventType && { event_type: eventType }),
        ...(status && { status })
      });

      const response = await fetch(`/api/admin/events?${params}`);
      const data: EventsResponse = await response.json();

      if (data.success) {
        setEvents(data.data.events);
        setPagination(data.data.pagination);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch events');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Fetch events error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(1);
  }, [search, eventType, status]);

  const handleDelete = async (event: Event) => {
    if (!confirm(`Are you sure you want to delete "${event.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Refresh events list
        fetchEvents(pagination.page);
      } else {
        alert(data.error || 'Failed to delete event');
      }
    } catch (err) {
      alert('Network error occurred');
      console.error('Delete event error:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="events-page">
      <style jsx>{`
        .events-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .page-title {
          font-size: 2rem;
          font-weight: bold;
          color: #2d3748;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .create-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .create-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .filters-section {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 1rem;
          align-items: end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-label {
          font-weight: 600;
          color: #4a5568;
          font-size: 0.875rem;
        }

        .filter-input, .filter-select {
          padding: 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .filter-input:focus, .filter-select:focus {
          outline: none;
          border-color: #667eea;
        }

        .events-grid {
          display: grid;
          gap: 1.5rem;
        }

        .event-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: all 0.2s;
        }

        .event-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .event-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .event-title {
          font-size: 1.25rem;
          font-weight: bold;
          color: #2d3748;
          margin-bottom: 0.5rem;
        }

        .event-meta {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .event-type {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .event-status {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .event-body {
          padding: 1.5rem;
        }

        .event-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #4a5568;
        }

        .detail-icon {
          font-size: 1rem;
        }

        .event-description {
          color: #718096;
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        .event-stats {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .stat-item {
          background: #f7fafc;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          text-align: center;
          flex: 1;
        }

        .stat-number {
          font-size: 1.25rem;
          font-weight: bold;
          color: #2d3748;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .event-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .action-button {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
        }

        .view-button {
          background: #e2e8f0;
          color: #4a5568;
        }

        .view-button:hover {
          background: #cbd5e0;
        }

        .edit-button {
          background: #667eea;
          color: white;
        }

        .edit-button:hover {
          background: #5a67d8;
        }

        .delete-button {
          background: #e53e3e;
          color: white;
        }

        .delete-button:hover {
          background: #c53030;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 2rem;
        }

        .pagination-button {
          padding: 0.5rem 1rem;
          border: 2px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-button:hover:not(:disabled) {
          border-color: #667eea;
          background: #667eea;
          color: white;
        }

        .pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-info {
          color: #718096;
          font-size: 0.875rem;
        }

        .loading, .error {
          text-align: center;
          padding: 3rem;
          color: #718096;
        }

        .error {
          color: #e53e3e;
        }

        .no-events {
          text-align: center;
          padding: 3rem;
          color: #718096;
        }

        .no-events-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
          .events-page {
            padding: 1rem;
          }

          .page-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .event-details {
            grid-template-columns: 1fr;
          }

          .event-actions {
            flex-wrap: wrap;
          }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">
          <span>📅</span>
          Event Management
        </h1>
        <Link href="/admin/events/new" className="create-button">
          <span>➕</span>
          Create Event
        </Link>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">Search Events</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Search by title, description, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Event Type</label>
            <select
              className="filter-select"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              <option value="">All Types</option>
              {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              className="filter-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="loading">Loading events...</div>}
      {error && <div className="error">Error: {error}</div>}

      {!loading && !error && (
        <>
          {events.length === 0 ? (
            <div className="no-events">
              <div className="no-events-icon">📅</div>
              <h3>No events found</h3>
              <p>Create your first event to get started with attendant scheduling.</p>
            </div>
          ) : (
            <div className="events-grid">
              {events.map((event) => (
                <div key={event.id} className="event-card">
                  <div className="event-header">
                    <h3 className="event-title">{event.title}</h3>
                    <div className="event-meta">
                      <span className="event-type">
                        {EVENT_TYPE_LABELS[event.event_type as keyof typeof EVENT_TYPE_LABELS]}
                      </span>
                      <span className={`event-status ${STATUS_COLORS[event.status]}`}>
                        {STATUS_LABELS[event.status]}
                      </span>
                    </div>
                  </div>
                  
                  <div className="event-body">
                    <div className="event-details">
                      <div className="detail-item">
                        <span className="detail-icon">📅</span>
                        <span>
                          {formatDate(event.start_date)}
                          {event.start_date !== event.end_date && ` - ${formatDate(event.end_date)}`}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">⏰</span>
                        <span>
                          {formatTime(event.start_time)}
                          {event.end_time && ` - ${formatTime(event.end_time)}`}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">📍</span>
                        <span>{event.location}</span>
                      </div>
                    </div>

                    {event.description && (
                      <div className="event-description">
                        {event.description}
                      </div>
                    )}

                    <div className="event-stats">
                      {event.capacity && (
                        <div className="stat-item">
                          <div className="stat-number">{event.capacity}</div>
                          <div className="stat-label">Capacity</div>
                        </div>
                      )}
                      {event.attendants_needed && (
                        <div className="stat-item">
                          <div className="stat-number">{event.attendants_needed}</div>
                          <div className="stat-label">Needed</div>
                        </div>
                      )}
                      <div className="stat-item">
                        <div className="stat-number">{event.assigned_attendants}</div>
                        <div className="stat-label">Assigned</div>
                      </div>
                    </div>

                    <div className="event-actions">
                      <Link href={`/admin/events/${event.id}`} className="action-button view-button">
                        View
                      </Link>
                      <Link href={`/admin/events/${event.id}/edit`} className="action-button edit-button">
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(event)}
                        className="action-button delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="pagination-button"
                disabled={!pagination.hasPrev}
                onClick={() => fetchEvents(pagination.page - 1)}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              <button
                className="pagination-button"
                disabled={!pagination.hasNext}
                onClick={() => fetchEvents(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
