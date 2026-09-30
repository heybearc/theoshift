export type VolunteerPageFilters = {
  search: string
  congregation: string
  isActive: 'all' | 'true' | 'false'
  overseerId: string
  keymanId: string
  formsOfService: string[]
  availability: 'all' | 'AVAILABLE' | 'NOT_AVAILABLE' | 'PARTIAL' | 'PENDING' | 'none'
}

export const DEFAULT_VOLUNTEER_FILTERS: VolunteerPageFilters = {
  search: '',
  congregation: '',
  isActive: 'true',
  overseerId: '',
  keymanId: '',
  formsOfService: [],
  availability: 'all',
}

const AVAILABILITY_VALUES = [
  'all',
  'AVAILABLE',
  'NOT_AVAILABLE',
  'PARTIAL',
  'PENDING',
  'none',
] as const

export function volunteerFiltersStorageKey(eventId: string) {
  return `theoshift:volunteers:${eventId}:filters`
}

export function parseVolunteerFiltersFromSearchParams(
  params: URLSearchParams
): VolunteerPageFilters {
  const isActiveRaw = params.get('isActive')
  const isActive =
    isActiveRaw === 'all' || isActiveRaw === 'true' || isActiveRaw === 'false'
      ? isActiveRaw
      : DEFAULT_VOLUNTEER_FILTERS.isActive
  const availabilityRaw = params.get('availability') || DEFAULT_VOLUNTEER_FILTERS.availability
  const availability = AVAILABILITY_VALUES.includes(availabilityRaw as (typeof AVAILABILITY_VALUES)[number])
    ? (availabilityRaw as VolunteerPageFilters['availability'])
    : DEFAULT_VOLUNTEER_FILTERS.availability

  return {
    search: params.get('search') || '',
    congregation: params.get('congregation') || '',
    isActive,
    overseerId: params.get('overseerId') || '',
    keymanId: params.get('keymanId') || '',
    formsOfService: params.get('formsOfService')?.split(',').filter(Boolean) || [],
    availability,
  }
}

export function applyVolunteerFiltersToUrl(
  url: URL,
  filters: VolunteerPageFilters,
  page: number,
  perPage: number
) {
  if (filters.search) url.searchParams.set('search', filters.search)
  else url.searchParams.delete('search')

  if (filters.congregation) url.searchParams.set('congregation', filters.congregation)
  else url.searchParams.delete('congregation')

  url.searchParams.set('isActive', filters.isActive)

  if (filters.overseerId) url.searchParams.set('overseerId', filters.overseerId)
  else url.searchParams.delete('overseerId')

  if (filters.keymanId) url.searchParams.set('keymanId', filters.keymanId)
  else url.searchParams.delete('keymanId')

  if (filters.formsOfService.length > 0) {
    url.searchParams.set('formsOfService', filters.formsOfService.join(','))
  } else {
    url.searchParams.delete('formsOfService')
  }

  if (filters.availability !== 'all') url.searchParams.set('availability', filters.availability)
  else url.searchParams.delete('availability')

  url.searchParams.set('page', String(page))
  url.searchParams.set('perPage', String(perPage))
}

export function readStoredVolunteerListState(eventId: string): {
  filters: VolunteerPageFilters
  page: number
  perPage: number
} | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(volunteerFiltersStorageKey(eventId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      filters?: VolunteerPageFilters
      page?: number
      perPage?: number
    }
    if (!parsed?.filters) return null
    return {
      filters: { ...DEFAULT_VOLUNTEER_FILTERS, ...parsed.filters },
      page: parsed.page || 1,
      perPage: parsed.perPage || 20,
    }
  } catch {
    return null
  }
}

export function writeStoredVolunteerListState(
  eventId: string,
  filters: VolunteerPageFilters,
  page: number,
  perPage: number
) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      volunteerFiltersStorageKey(eventId),
      JSON.stringify({ filters, page, perPage })
    )
  } catch {
    // Ignore quota / private-mode failures
  }
}

export function volunteerSearchParamsHaveListState(params: URLSearchParams) {
  return (
    params.has('search') ||
    params.has('congregation') ||
    params.has('isActive') ||
    params.has('overseerId') ||
    params.has('keymanId') ||
    params.has('formsOfService') ||
    params.has('availability') ||
    params.has('page') ||
    params.has('perPage')
  )
}
