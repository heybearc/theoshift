'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const EVENT_TYPES = [
  { value: 'assembly', label: 'Circuit Assembly' },
  { value: 'convention', label: 'Regional Convention' },
  { value: 'circuit_overseer_visit', label: 'Circuit Overseer Visit' },
  { value: 'special_event', label: 'Special Event' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'memorial', label: 'Memorial' },
  { value: 'other', label: 'Other' }
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' }
];

interface EventFormData {
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location: string;
  capacity: string;
  attendants_needed: string;
  status: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    event_type: 'meeting',
    start_date: '',
    end_date: '',
    start_time: '19:00',
    end_time: '21:00',
    location: '',
    capacity: '',
    attendants_needed: '',
    status: 'draft'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-set end_date to start_date if not set
    if (name === 'start_date' && !formData.end_date) {
      setFormData(prev => ({
        ...prev,
        end_date: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Event title is required');
      }
      if (!formData.start_date) {
        throw new Error('Start date is required');
      }
      if (!formData.location.trim()) {
        throw new Error('Location is required');
      }

      // Prepare data for submission
      const submitData = {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        attendants_needed: formData.attendants_needed ? parseInt(formData.attendants_needed) : null,
      };

      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/admin/events');
      } else {
        setError(data.error || 'Failed to create event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-event-page">
      <style jsx>{`
        .new-event-page {
          padding: 2rem;
          max-width: 800px;
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

        .back-button {
          background: #e2e8f0;
          color: #4a5568;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .back-button:hover {
          background: #cbd5e0;
        }

        .form-container {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .form-grid {
          display: grid;
          gap: 1.5rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-weight: 600;
          color: #4a5568;
          font-size: 0.875rem;
        }

        .form-label.required::after {
          content: ' *';
          color: #e53e3e;
        }

        .form-input, .form-select, .form-textarea {
          padding: 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-textarea {
          min-height: 100px;
          resize: vertical;
        }

        .form-help {
          font-size: 0.75rem;
          color: #718096;
          margin-top: 0.25rem;
        }

        .error-message {
          background: #fed7d7;
          color: #c53030;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-weight: 600;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .cancel-button {
          background: #e2e8f0;
          color: #4a5568;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
        }

        .cancel-button:hover {
          background: #cbd5e0;
        }

        .submit-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .new-event-page {
            padding: 1rem;
          }

          .page-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">
          <span>➕</span>
          Create New Event
        </h1>
        <Link href="/admin/events" className="back-button">
          <span>←</span>
          Back to Events
        </Link>
      </div>

      <div className="form-container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label required">Event Title</label>
              <input
                type="text"
                name="title"
                className="form-input"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter event title..."
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Event Type</label>
                <select
                  name="event_type"
                  className="form-select"
                  value={formData.event_type}
                  onChange={handleInputChange}
                  required
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Status</label>
                <select
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  className="form-input"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">End Date</label>
                <input
                  type="date"
                  name="end_date"
                  className="form-input"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Start Time</label>
                <input
                  type="time"
                  name="start_time"
                  className="form-input"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  name="end_time"
                  className="form-input"
                  value={formData.end_time}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label className="form-label required">Location</label>
              <input
                type="text"
                name="location"
                className="form-input"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter event location..."
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Capacity</label>
                <input
                  type="number"
                  name="capacity"
                  className="form-input"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  placeholder="Maximum attendees"
                  min="1"
                />
                <div className="form-help">Maximum number of attendees</div>
              </div>

              <div className="form-group">
                <label className="form-label">Attendants Needed</label>
                <input
                  type="number"
                  name="attendants_needed"
                  className="form-input"
                  value={formData.attendants_needed}
                  onChange={handleInputChange}
                  placeholder="Number needed"
                  min="0"
                />
                <div className="form-help">Number of attendants required</div>
              </div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                className="form-textarea"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter event description..."
                rows={4}
              />
              <div className="form-help">Optional description of the event</div>
            </div>
          </div>

          <div className="form-actions">
            <Link href="/admin/events" className="cancel-button">
              Cancel
            </Link>
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span>⏳</span>
                  Creating...
                </>
              ) : (
                <>
                  <span>✅</span>
                  Create Event
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
