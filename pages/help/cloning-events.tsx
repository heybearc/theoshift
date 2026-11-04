import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import Link from 'next/link'

interface CloningEventsProps {
  userRole: string
}

export default function CloningEventsPage({ userRole }: CloningEventsProps) {
  return (
    <HelpLayout title="Cloning Events">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📋 Cloning Events</h1>
          <p className="text-gray-600">
            Duplicate events with full control over what gets copied
          </p>
        </div>

        {/* Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">What is Event Cloning?</h2>
          <p className="text-blue-800 mb-3">
            Event cloning lets you create a copy of an existing event. You can choose exactly what to copy - 
            positions, volunteers, assignments, settings, and more.
          </p>
          <p className="text-blue-800">
            <strong>Why is this useful?</strong> If you run similar events regularly (like circuit assemblies 
            or conventions), you can clone a previous event to save time. You can copy just the structure 
            (positions and settings) without copying the people, or copy everything for a complete duplicate.
          </p>
        </div>

        <div className="space-y-8">
          {/* How to Clone an Event */}
          {(userRole === 'ADMIN' || userRole === 'OVERSEER') && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🔄 How to Clone an Event</h2>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Navigate to the Event</h4>
                      <p className="text-gray-600">Go to the event you want to clone</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Click "Edit Event"</h4>
                      <p className="text-gray-600">Open the event editor</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Click "Clone Event"</h4>
                      <p className="text-gray-600">Look for the Clone Event button in the editor</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Select What to Clone</h4>
                      <p className="text-gray-600">Choose which items to copy (see options below)</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Enter New Event Name</h4>
                      <p className="text-gray-600">Give your cloned event a unique name</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">6</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Click "Clone Event"</h4>
                      <p className="text-gray-600">Create the cloned event</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clone Options */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">✅ What You Can Clone</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <p className="text-gray-600 mb-4">
                You have full control over what gets copied. Check or uncheck each option based on your needs.
              </p>

              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-gray-900">📋 Positions</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Copy all position definitions including names, numbers, and shift times.
                  </p>
                  <p className="text-gray-600 text-sm italic">
                    <strong>When to use:</strong> Almost always! This copies the structure of your event.
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-gray-900">👥 Volunteers</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Copy the volunteer list (people registered for the event) onto the new event’s Volunteers tab.
                  </p>
                  <p className="text-gray-600 text-sm italic">
                    <strong>When to use:</strong> When the same people will serve at the new event.
                  </p>
                  <p className="text-yellow-700 text-sm mt-2">
                    ⚠️ <strong>Note:</strong> Unchecked by default for easier event sharing.
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold text-gray-900">📌 Assignments</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Copy volunteer-to-position assignments (who is assigned where), including shift day and how many people each shift needs.
                  </p>
                  <p className="text-gray-600 text-sm italic">
                    <strong>When to use:</strong> When you want the exact same people in the exact same positions.
                  </p>
                  <p className="text-yellow-700 text-sm mt-2">
                    ⚠️ <strong>Note:</strong> Only works if you also clone volunteers.
                  </p>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-gray-900">🎫 Lanyards</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Copy lanyard badge numbers and configuration. Checkout state starts fresh (all available).
                  </p>
                  <p className="text-gray-600 text-sm italic">
                    <strong>When to use:</strong> When volunteers will use the same lanyard setup.
                  </p>
                </div>

                <div className="border-l-4 border-violet-500 pl-4">
                  <h4 className="font-semibold text-gray-900">🧭 Oversight Details</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Copy department overseer contacts, keymen, and per-position oversight assignments.
                  </p>
                  <p className="text-gray-600 text-sm italic">
                    <strong>When to use:</strong> When the same oversight structure applies to the new event.
                  </p>
                </div>

                <div className="border-l-4 border-pink-500 pl-4">
                  <h4 className="font-semibold text-gray-900">🔐 Permissions</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Copy user permissions (who can edit/manage the event). Position-scoped access is remapped to the new positions.
                  </p>
                  <p className="text-gray-600 text-sm italic">
                    <strong>When to use:</strong> When the same team will manage the new event.
                  </p>
                </div>

                <div className="border-l-4 border-indigo-500 pl-4">
                  <h4 className="font-semibold text-gray-900">⚙️ Settings</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Copy event settings (module toggles, terminology, etc.).
                  </p>
                  <p className="text-gray-600 text-sm italic">
                    <strong>When to use:</strong> Almost always! This ensures consistent configuration.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Common Scenarios */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 Common Cloning Scenarios</h2>
            
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Scenario 1: Next Circuit Assembly</h4>
                <p className="text-gray-600 text-sm mb-3">
                  You want to set up the next circuit assembly with the same structure but different volunteers.
                </p>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm font-semibold text-green-900 mb-2">✅ Clone these:</p>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Positions (get the same structure)</li>
                    <li>• Settings (keep the same configuration)</li>
                  </ul>
                </div>
                <div className="bg-red-50 p-3 rounded mt-2">
                  <p className="text-sm font-semibold text-red-900 mb-2">❌ Don't clone these:</p>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• Volunteers (you'll invite new people)</li>
                    <li>• Assignments (no volunteers to assign yet)</li>
                    <li>• Lanyards (will be different people)</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Scenario 2: Sharing Event Template</h4>
                <p className="text-gray-600 text-sm mb-3">
                  You want to share your event structure with another circuit, but not your volunteer data.
                </p>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm font-semibold text-green-900 mb-2">✅ Clone these:</p>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Positions (share the structure)</li>
                    <li>• Settings (share the configuration)</li>
                  </ul>
                </div>
                <div className="bg-red-50 p-3 rounded mt-2">
                  <p className="text-sm font-semibold text-red-900 mb-2">❌ Don't clone these:</p>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• Volunteers (privacy - don't share volunteer data)</li>
                    <li>• Assignments (no volunteers to assign)</li>
                    <li>• Lanyards (different people)</li>
                    <li>• Permissions (different management team)</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Scenario 3: Complete Duplicate</h4>
                <p className="text-gray-600 text-sm mb-3">
                  You want an exact copy of everything for testing or backup purposes.
                </p>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm font-semibold text-green-900 mb-2">✅ Clone everything:</p>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Positions</li>
                    <li>• Volunteers</li>
                    <li>• Assignments</li>
                    <li>• Lanyards</li>
                    <li>• Permissions</li>
                    <li>• Settings</li>
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
                <h4 className="font-semibold text-gray-900 mb-2">Can I edit the cloned event after creating it?</h4>
                <p className="text-gray-600 text-sm">
                  Yes! The cloned event is completely independent. You can edit, add, or remove anything 
                  without affecting the original event.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Why are volunteers unchecked by default?</h4>
                <p className="text-gray-600 text-sm">
                  For privacy and ease of sharing. Most people clone events to create templates or share 
                  structures, not to duplicate volunteer data. You can always check it if you need to copy volunteers.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">What happens if I clone assignments without volunteers?</h4>
                <p className="text-gray-600 text-sm">
                  The assignments won't be copied because there are no volunteers to assign. You need to 
                  clone volunteers first if you want to clone assignments.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Can I clone an event multiple times?</h4>
                <p className="text-gray-600 text-sm">
                  Yes! You can clone the same event as many times as you need. Each clone is independent.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Does cloning copy count times or documents?</h4>
                <p className="text-gray-600 text-sm">
                  Documents are copied when that box is checked, including the station diagram.
                  Count times are not copied. The new event starts with none.
                  If you give the copy a new start date, the shifts move with that date.
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
                <span>Create a "master template" event that you clone for each new assembly</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Always give cloned events descriptive names to avoid confusion</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Review the cloned event settings before inviting volunteers</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>When sharing event structures, uncheck volunteers and permissions for privacy</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Clone positions and settings together to maintain consistency</span>
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
            <Link href="/help/event-settings" className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-1">⚙️ Event Settings</h4>
              <p className="text-sm text-gray-600">Customize modules and terminology</p>
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
