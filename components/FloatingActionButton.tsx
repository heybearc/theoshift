import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface QuickAction {
  id: string
  label: string
  icon: string
  onClick: () => void
  color?: string
}

interface FloatingActionButtonProps {
  actions?: QuickAction[]
  primaryAction?: QuickAction
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left'
}

export default function FloatingActionButton({ 
  actions = [], 
  primaryAction,
  position = 'bottom-right' 
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const router = useRouter()

  // Hide FAB on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false)
        setIsExpanded(false)
      } else {
        // Scrolling up
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Close menu on route change
  useEffect(() => {
    setIsExpanded(false)
  }, [router.pathname])

  const handlePrimaryClick = () => {
    if (actions.length > 0) {
      setIsExpanded(!isExpanded)
    } else if (primaryAction) {
      primaryAction.onClick()
    }
  }

  const handleActionClick = (action: QuickAction) => {
    action.onClick()
    setIsExpanded(false)
  }

  const positionClasses = {
    'bottom-right': 'bottom-20 right-6',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-20 left-6'
  }

  if (!isVisible && !isExpanded) return null

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* FAB Container */}
      <div className={`fixed ${positionClasses[position]} z-50 md:hidden`}>
        {/* Quick Actions Menu */}
        {isExpanded && actions.length > 0 && (
          <div className="absolute bottom-16 right-0 mb-2 space-y-2 animate-fade-in">
            {actions.map((action, index) => (
              <div
                key={action.id}
                className="flex items-center justify-end space-x-2 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Action Label */}
                <span className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                  {action.label}
                </span>
                
                {/* Action Button */}
                <button
                  onClick={() => handleActionClick(action)}
                  className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white text-xl transition-transform hover:scale-110 active:scale-95 ${
                    action.color || 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {action.icon}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Primary FAB */}
        <button
          onClick={handlePrimaryClick}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white text-2xl transition-all duration-300 ${
            isExpanded 
              ? 'bg-gray-600 hover:bg-gray-700 rotate-45' 
              : 'bg-blue-600 hover:bg-blue-700'
          } active:scale-95 hover:scale-110`}
          aria-label={isExpanded ? 'Close menu' : primaryAction?.label || 'Quick actions'}
        >
          {isExpanded ? '✕' : primaryAction?.icon || '+'}
        </button>

        {/* Ripple Effect */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <div className="absolute inset-0 rounded-full bg-white opacity-0 hover:opacity-20 transition-opacity" />
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </>
  )
}
