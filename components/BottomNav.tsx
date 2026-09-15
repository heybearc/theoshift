import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { eventPositionsHref } from '../lib/eventPositionsHref'

interface BottomNavProps {
  selectedEventId?: string
}

export default function BottomNav({ selectedEventId }: BottomNavProps) {
  const router = useRouter()
  const { data: session } = useSession()

  const navItems = [
    {
      label: 'Events',
      href: '/events/select',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      activePattern: '/events',
      roles: ['ADMIN', 'OVERSEER', 'ATTENDANT']
    },
    {
      label: 'Volunteers',
      href: selectedEventId ? `/events/${selectedEventId}/volunteers` : '/events/select',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      activePattern: '/volunteers',
      roles: ['ADMIN', 'OVERSEER', 'ATTENDANT']
    },
    {
      label: 'Positions',
      href: selectedEventId ? eventPositionsHref(selectedEventId) : '/events/select',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      activePattern: '/positions',
      roles: ['ADMIN', 'OVERSEER', 'ATTENDANT']
    },
    {
      label: 'Help',
      href: '/help',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      activePattern: '/help',
      roles: ['ADMIN', 'OVERSEER', 'ATTENDANT', 'VOLUNTEER']
    }
  ]

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(session?.user?.role || '')
  )

  const isActive = (pattern: string) => {
    return router.pathname.includes(pattern)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-30 shadow-lg">
      <div className="flex justify-around items-center h-16">
        {filteredNavItems.map((item) => {
          const active = isActive(item.activePattern)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`tap-target flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className={`transition-transform ${active ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? 'text-blue-600' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
