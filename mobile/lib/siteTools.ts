export type SiteTool = {
  title: string
  detail: string
  path: string
  kind: 'volunteer' | 'staff'
}

export const SHARED_TOOLS: SiteTool[] = [
  { title: 'Help', detail: 'Guides for every part of TheoShift', path: '/help', kind: 'volunteer' },
  { title: 'Send feedback', detail: 'Tell us what to fix or add', path: '/help/feedback', kind: 'volunteer' },
  { title: 'My feedback', detail: 'Replies to feedback you sent', path: '/help/my-feedback', kind: 'volunteer' },
  { title: 'Privacy', detail: 'How TheoShift handles your record', path: '/privacy', kind: 'volunteer' },
]

export const VOLUNTEER_TOOLS: SiteTool[] = [
  {
    title: 'Request a volunteer',
    detail: 'Submit someone for IVS approval',
    path: '/volunteer/dashboard?tab=request',
    kind: 'volunteer',
  },
  {
    title: 'Volunteer website',
    detail: 'Availability, documents, and the rest of the volunteer pages',
    path: '/volunteer/select-event',
    kind: 'volunteer',
  },
]

export const STAFF_TOOLS: SiteTool[] = [
  {
    title: 'Event tools',
    detail: 'Events, positions, volunteers, counts, lanyards, documents, IVS, and permissions',
    path: '/events/select',
    kind: 'staff',
  },
  { title: 'Create event', detail: 'Start a new event', path: '/events/create', kind: 'staff' },
  { title: 'Guest lookup', detail: 'Look someone up', path: '/guest-lookup', kind: 'staff' },
  { title: 'Release notes', detail: 'What changed on the website', path: '/release-notes', kind: 'staff' },
]

export const ADMIN_TOOLS: SiteTool[] = [
  { title: 'Admin home', detail: 'System dashboard', path: '/admin', kind: 'staff' },
  { title: 'Users', detail: 'Accounts and invitations', path: '/admin/users', kind: 'staff' },
  { title: 'Locations', detail: 'Places used by events', path: '/admin/locations', kind: 'staff' },
  { title: 'Announcements', detail: 'Global announcements', path: '/admin/global-announcements', kind: 'staff' },
  { title: 'Feedback inbox', detail: 'Feedback from the field', path: '/admin/feedback', kind: 'staff' },
  { title: 'Health', detail: 'Service health', path: '/admin/health', kind: 'staff' },
  { title: 'API status', detail: 'API checks', path: '/admin/api-status', kind: 'staff' },
  { title: 'Audit logs', detail: 'Who changed what', path: '/admin/audit-logs', kind: 'staff' },
  { title: 'System ops', detail: 'Operations tools', path: '/admin/system-ops', kind: 'staff' },
  { title: 'Email config', detail: 'Outbound email', path: '/admin/email-config', kind: 'staff' },
  { title: 'Review sign-in', detail: 'Reviewer sign-in', path: '/admin/review-signin', kind: 'staff' },
]

export function eventTools(eventId: string): SiteTool[] {
  return [
    { title: 'Event overview', detail: 'Status and quick actions', path: `/events/${eventId}`, kind: 'staff' },
    { title: 'Positions', detail: 'Day board and shifts', path: `/events/${eventId}/positions-next`, kind: 'staff' },
    { title: 'Volunteers', detail: 'Roster, import, and bulk edits', path: `/events/${eventId}/volunteers`, kind: 'staff' },
    { title: 'Assignments', detail: 'Who is on which shift', path: `/events/${eventId}/assignments`, kind: 'staff' },
    { title: 'Count times', detail: 'Set up and review attendance counts', path: `/events/${eventId}/count-times`, kind: 'staff' },
    { title: 'Lanyards', detail: 'Print and manage lanyards', path: `/events/${eventId}/lanyards`, kind: 'staff' },
    { title: 'Documents', detail: 'Publish files for this event', path: `/events/${eventId}/documents`, kind: 'staff' },
    { title: 'Announcements', detail: 'Event announcements', path: `/events/${eventId}/announcements`, kind: 'staff' },
    { title: 'IVS', detail: 'Approvals, import, and early entry', path: `/events/${eventId}/ivs`, kind: 'staff' },
    { title: 'Permissions', detail: 'Who can manage this event', path: `/events/${eventId}/permissions`, kind: 'staff' },
    { title: 'Event chat', detail: 'Staff chat for this event', path: `/events/${eventId}/chat`, kind: 'staff' },
    { title: 'Event settings', detail: 'Name, modules, and oversight', path: `/events/${eventId}/edit`, kind: 'staff' },
  ]
}

export function withSelectedEvent(path: string, eventId: string | null): string {
  if (!path.startsWith('/volunteer/dashboard')) return path
  if (!eventId) return '/volunteer/select-event'
  const join = path.includes('?') ? '&' : '?'
  return `${path}${join}eventId=${encodeURIComponent(eventId)}`
}
