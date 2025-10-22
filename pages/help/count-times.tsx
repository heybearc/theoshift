import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import Link from 'next/link'

interface CountTimesProps {
  userRole: string
}

export default function CountTimesPage({ userRole }: CountTimesProps) {
  return (
    <HelpLayout title="Count Times">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⏰ Count Times</h1>
          <p className="text-gray-600">
            Recording and managing attendance counts during events
          </p>
        </div>

        {/* Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">Attendance Counting Overview</h2>
          <p className="text-blue-800">
            Count times help track attendance throughout events, ensuring proper coverage and 
            providing valuable data for planning future events and reporting purposes.
          </p>
        </div>

        <div className="space-y-8">
          {/* Types of Counts */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Types of Attendance Counts</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">👥 General Attendance</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• <strong>Peak Attendance:</strong> Maximum number of attendees present</li>
                  <li>• <strong>Session Counts:</strong> Attendance for each program session</li>
                  <li>• <strong>Demographic Breakdown:</strong> Adults, children, visitors</li>
                  <li>• <strong>Congregation Representation:</strong> Attendees by congregation</li>
                </ul>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🛡️ Attendant Coverage</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• <strong>Position Staffing:</strong> Attendants present per position</li>
                  <li>• <strong>Shift Coverage:</strong> Coverage percentage by time period</li>
                  <li>• <strong>Check-in Status:</strong> Who has arrived and checked in</li>
                  <li>• <strong>Break Rotations:</strong> Attendants on break vs. active</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Count Process */}
          {(userRole === 'ADMIN' || userRole === 'OVERSEER' || userRole === 'ASSISTANT_OVERSEER' || userRole === 'KEYMAN') && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📝 Count Recording Process</h2>
              
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Pre-Event Setup</h3>
                  <div className="space-y-3">
                    <p className="text-gray-600">Before the event begins:</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>Assign Counters:</strong> Designate responsible individuals for each area</li>
                      <li>• <strong>Set Count Times:</strong> Establish when counts will be taken</li>
                      <li>• <strong>Prepare Materials:</strong> Ensure counting sheets and devices are ready</li>
                      <li>• <strong>Brief Team:</strong> Explain counting procedures to all involved</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 2: During the Event</h3>
                  <div className="space-y-3">
                    <p className="text-gray-600">Throughout the event:</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>Regular Counts:</strong> Take counts at predetermined intervals</li>
                      <li>• <strong>Peak Attendance:</strong> Identify and record maximum attendance</li>
                      <li>• <strong>Position Monitoring:</strong> Track attendant check-ins and coverage</li>
                      <li>• <strong>Real-time Updates:</strong> Update the system with current numbers</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Data Entry</h3>
                  <div className="space-y-3">
                    <p className="text-gray-600">Recording counts in the system:</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>Timely Entry:</strong> Enter counts promptly while numbers are fresh</li>
                      <li>• <strong>Accuracy Check:</strong> Verify numbers before final submission</li>
                      <li>• <strong>Notes & Context:</strong> Add relevant notes about unusual circumstances</li>
                      <li>• <strong>Backup Records:</strong> Maintain paper backups of all counts</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Counting Guidelines */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📏 Counting Guidelines</h2>
            
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">General Attendance Counting</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Who to Count</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• All attendees present in the main auditorium</li>
                      <li>• Include children and infants</li>
                      <li>• Count attendants on duty in visible areas</li>
                      <li>• Include overflow areas if applicable</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">When to Count</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• At the start of each major session</li>
                      <li>• During peak attendance periods</li>
                      <li>• Before and after meal breaks</li>
                      <li>• At the conclusion of the event</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendant Coverage Tracking</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Check-in Procedures</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Attendants must check in upon arrival</li>
                      <li>• Record actual arrival time vs. scheduled time</li>
                      <li>• Note any position changes or substitutions</li>
                      <li>• Track break times and rotations</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Coverage Monitoring</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Verify all critical positions are staffed</li>
                      <li>• Identify any gaps in coverage</li>
                      <li>• Track overtime or extended shifts</li>
                      <li>• Document any incidents or issues</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reporting */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📈 Reporting & Analysis</h2>
            
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Standard Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Attendance Summary</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Peak attendance numbers</li>
                      <li>• Session-by-session breakdown</li>
                      <li>• Demographic analysis</li>
                      <li>• Comparison to previous events</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Attendant Performance</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Coverage percentage by position</li>
                      <li>• Punctuality and reliability metrics</li>
                      <li>• No-show and cancellation rates</li>
                      <li>• Overtime and scheduling efficiency</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Using Data for Planning</h3>
                <div className="space-y-3">
                  <p className="text-gray-600">Count data helps with:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• <strong>Future Capacity Planning:</strong> Estimate attendance for similar events</li>
                    <li>• <strong>Staffing Optimization:</strong> Adjust attendant assignments based on actual needs</li>
                    <li>• <strong>Resource Allocation:</strong> Plan facilities, parking, and services</li>
                    <li>• <strong>Budget Planning:</strong> Estimate costs for future events</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Technology Integration */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">💻 Technology Integration</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Digital Counting Tools</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Mobile Check-in</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Attendants can check in using mobile devices, providing real-time attendance data.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Automated Counting</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Integration with turnstiles or scanning systems for accurate attendance tracking.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Real-time Dashboards</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Live dashboards showing current attendance and coverage status.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Best Practices */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-900 mb-4">✅ Best Practices</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-green-800 mb-3">Accuracy Tips</h3>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>• Use multiple counters for verification</li>
                  <li>• Count systematically (left to right, section by section)</li>
                  <li>• Record counts immediately</li>
                  <li>• Double-check unusual numbers</li>
                  <li>• Maintain consistent counting methods</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-green-800 mb-3">Efficiency Tips</h3>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>• Establish clear counting schedules</li>
                  <li>• Use technology when available</li>
                  <li>• Train counters in advance</li>
                  <li>• Prepare backup counting methods</li>
                  <li>• Document procedures for consistency</li>
                </ul>
              </div>
            </div>
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
      userRole: session.user?.role || 'ATTENDANT',
    },
  }
}
