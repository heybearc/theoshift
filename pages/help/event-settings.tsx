import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import Link from 'next/link'

interface EventSettingsProps {
  userRole: string
}

export default function EventSettingsPage({ userRole }: EventSettingsProps) {
  return (
    <HelpLayout title="Event Settings & Modules">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⚙️ Event Settings & Modules</h1>
          <p className="text-gray-600">
            Customize each event with module toggles and terminology settings
          </p>
        </div>

        {/* Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">What Are Event Settings?</h2>
          <p className="text-blue-800 mb-3">
            Event settings allow you to customize each event individually. You can enable or disable specific 
            features (modules) and customize terminology to match your needs.
          </p>
          <p className="text-blue-800">
            <strong>Why is this useful?</strong> Not every event needs every feature. For example, a simple 
            one-day assembly might not need count times or documents, while a multi-day convention might need 
            everything. Event settings let you keep the interface clean and focused.
          </p>
        </div>

        <div className="space-y-8">
          {/* Accessing Event Settings */}
          {(userRole === 'ADMIN' || userRole === 'OVERSEER') && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📍 How to Access Event Settings</h2>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Navigate to Your Event</h4>
                      <p className="text-gray-600">Go to the event you want to configure</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Click "Edit Event"</h4>
                      <p className="text-gray-600">Look for the Edit Event button in the event dashboard</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Select "Modules & Features" Tab</h4>
                      <p className="text-gray-600">Click on the Modules & Features tab to access settings</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Module Toggles */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🎛️ Module Toggles</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <p className="text-gray-600 mb-4">
                Each module controls a specific feature of your event. When you disable a module, 
                that feature is hidden from the event interface.
              </p>

              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-gray-900">📋 Positions Module</h4>
                  <p className="text-gray-600 text-sm">
                    Controls the Positions page where you manage volunteer positions and shifts. 
                    Disable this if your event doesn't use formal position assignments.
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-gray-900">📄 Documents Module</h4>
                  <p className="text-gray-600 text-sm">
                    Controls the Documents page for sharing files with volunteers.
                    Publishing goes to people on the <strong>Volunteers roster</strong> only
                    (IVS-only people are not included unless they were also added to the roster).
                    Disable this if you don't need to share documents for this event.
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold text-gray-900">📢 Announcements Module</h4>
                  <p className="text-gray-600 text-sm">
                    Controls the Announcements page for event-wide communications. 
                    Disable this if you don't need announcements.
                  </p>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-gray-900">⏱️ Count Times Module</h4>
                  <p className="text-gray-600 text-sm">
                    Controls the Count Times feature for tracking attendance counts. 
                    Disable this if your event doesn't require count tracking.
                  </p>
                </div>

                <div className="border-l-4 border-pink-500 pl-4">
                  <h4 className="font-semibold text-gray-900">🎫 Lanyards Module</h4>
                  <p className="text-gray-600 text-sm">
                    Controls the Lanyards page for managing volunteer credentials.
                    Checking a badge back in keeps who had it, so you can look the number up later.
                    Disable this if you don't use lanyards for this event.
                  </p>
                </div>

                <div className="border-l-4 border-indigo-500 pl-4">
                  <h4 className="font-semibold text-gray-900">🌍 IVS Module</h4>
                  <p className="text-gray-600 text-sm">
                    Controls the International Volunteer Service features. 
                    Disable this if your event doesn't have international volunteers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Terminology Customization */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📝 Terminology Customization</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <p className="text-gray-600 mb-4">
                Customize the labels used throughout your event to match your preferences.
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Volunteer Terminology</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Choose what to call the people serving at your event:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li>• <strong>Volunteers</strong> - General term for all helpers</li>
                    <li>• <strong>Attendants</strong> - Traditional term for convention workers</li>
                    <li>• <strong>Workers</strong> - Alternative general term</li>
                    <li>• <strong>Custom</strong> - Use your own term</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Position Terminology</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Choose what to call work assignments:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li>• <strong>Positions</strong> - Specific work locations or roles</li>
                    <li>• <strong>Assignments</strong> - General work tasks</li>
                    <li>• <strong>Stations</strong> - Physical work locations</li>
                    <li>• <strong>Custom</strong> - Use your own term</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* What You'll See */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">👀 What You'll See</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Module Enforcement</h3>
              
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">✅ When a Module is Enabled</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Navigation tab appears in the event menu</li>
                    <li>• Dashboard card shows on the event overview</li>
                    <li>• Feature is fully accessible to users</li>
                  </ul>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">❌ When a Module is Disabled</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• Navigation tab is hidden</li>
                    <li>• Dashboard card doesn't appear</li>
                    <li>• Feature is not accessible (cleaner interface)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Common Questions */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">❓ Common Questions</h2>
            
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Can I change settings after the event starts?</h4>
                <p className="text-gray-600 text-sm">
                  Yes! You can enable or disable modules at any time. However, be careful when disabling 
                  modules that already have data - the data won't be deleted, but it will be hidden.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">What happens to existing data when I disable a module?</h4>
                <p className="text-gray-600 text-sm">
                  Your data is safe! Disabling a module only hides it from the interface. If you re-enable 
                  the module later, all your data will still be there.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Do I need to configure settings for every event?</h4>
                <p className="text-gray-600 text-sm">
                  No! If you don't customize settings, the event will use sensible defaults with all modules 
                  enabled. You only need to adjust settings if you want to hide certain features.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Can different events have different settings?</h4>
                <p className="text-gray-600 text-sm">
                  Absolutely! That's the whole point. Each event can have its own unique configuration. 
                  A simple assembly might only need positions and volunteers, while a large convention 
                  might need everything.
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">💡 Pro Tips</h3>
            <ul className="space-y-2 text-yellow-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Start with all modules enabled and disable only what you don't need</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Use consistent terminology across similar events for easier volunteer understanding</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Review your module settings before inviting volunteers to ensure they see the right features</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Disable unused modules to reduce clutter and make the interface easier to navigate</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Related Help */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Help Topics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/help/event-management" className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-1">📅 Event Management</h4>
              <p className="text-sm text-gray-600">Creating and managing events</p>
            </Link>
            <Link href="/help/cloning-events" className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-1">📋 Cloning Events</h4>
              <p className="text-sm text-gray-600">Duplicate events with custom options</p>
            </Link>
          </div>
        </div>
      </div>
    </HelpLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  return {
    props: {
      userRole: session.user.role || 'VOLUNTEER',
    },
  }
}
