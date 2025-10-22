import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import Link from 'next/link'

interface ManagingAssignmentsProps {
  userRole: string
}

export default function ManagingAssignmentsPage({ userRole }: ManagingAssignmentsProps) {
  return (
    <HelpLayout title="Managing Assignments">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">👥 Managing Assignments</h1>
          <p className="text-gray-600">
            How to assign attendants to positions and manage schedules effectively
          </p>
        </div>

        {/* Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">Assignment Management Overview</h2>
          <p className="text-blue-800">
            Assignments connect attendants to specific positions and shifts during events. 
            Proper assignment management ensures adequate coverage and smooth event operations.
          </p>
        </div>

        <div className="space-y-8">
          {/* Position Types */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Position Types</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🔒 Security Positions</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• <strong>Entrance Security:</strong> Monitor main entrances and check credentials</li>
                  <li>• <strong>Parking Attendants:</strong> Direct traffic and manage parking areas</li>
                  <li>• <strong>Roving Security:</strong> Patrol grounds and assist with crowd control</li>
                  <li>• <strong>Emergency Response:</strong> Handle emergency situations and evacuations</li>
                </ul>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🧹 Cleaning Assignments</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• <strong>Restroom Maintenance:</strong> Keep facilities clean and stocked</li>
                  <li>• <strong>Auditorium Cleaning:</strong> Maintain seating areas and aisles</li>
                  <li>• <strong>Grounds Keeping:</strong> Manage outdoor areas and landscaping</li>
                  <li>• <strong>Kitchen Support:</strong> Assist with food service and cleanup</li>
                </ul>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎛️ Technical Support</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• <strong>Sound System:</strong> Operate audio equipment and microphones</li>
                  <li>• <strong>Video/Streaming:</strong> Manage cameras and broadcast equipment</li>
                  <li>• <strong>IT Support:</strong> Handle network issues and technical problems</li>
                  <li>• <strong>Stage Management:</strong> Coordinate platform activities</li>
                </ul>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🏥 Medical & Support</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• <strong>First Aid:</strong> Provide medical assistance and emergency care</li>
                  <li>• <strong>Lost & Found:</strong> Manage lost items and reunite with owners</li>
                  <li>• <strong>Information Desk:</strong> Assist attendees with questions and directions</li>
                  <li>• <strong>Special Needs:</strong> Support elderly and disabled attendees</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Assignment Process */}
          {(userRole === 'ADMIN' || userRole === 'OVERSEER' || userRole === 'ASSISTANT_OVERSEER' || userRole === 'KEYMAN') && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">⚙️ Assignment Process</h2>
              
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Review Position Requirements</h3>
                  <div className="space-y-3">
                    <p className="text-gray-600">Before making assignments, review each position's requirements:</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>Qualifications:</strong> Age requirements, physical abilities, experience level</li>
                      <li>• <strong>Time Commitment:</strong> Shift duration, break schedules, total hours</li>
                      <li>• <strong>Responsibilities:</strong> Specific duties and expectations</li>
                      <li>• <strong>Training Needs:</strong> Required training or certification</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Select Qualified Attendants</h3>
                  <div className="space-y-3">
                    <p className="text-gray-600">Choose attendants based on:</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>Availability:</strong> Confirm they can attend the full shift</li>
                      <li>• <strong>Experience:</strong> Previous experience in similar roles</li>
                      <li>• <strong>Reliability:</strong> History of punctuality and commitment</li>
                      <li>• <strong>Skills:</strong> Relevant skills and abilities for the position</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Make Assignments</h3>
                  <div className="space-y-3">
                    <p className="text-gray-600">When creating assignments:</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>Assign Primary:</strong> Select the main attendant for each position</li>
                      <li>• <strong>Backup Coverage:</strong> Identify backup attendants for critical positions</li>
                      <li>• <strong>Shift Rotations:</strong> Plan rotations for long events</li>
                      <li>• <strong>Communication:</strong> Notify attendants of their assignments promptly</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 4: Monitor and Adjust</h3>
                  <div className="space-y-3">
                    <p className="text-gray-600">Throughout the event:</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>Track Attendance:</strong> Monitor who has checked in</li>
                      <li>• <strong>Handle Changes:</strong> Manage last-minute cancellations or conflicts</li>
                      <li>• <strong>Redistribute Load:</strong> Adjust assignments based on actual needs</li>
                      <li>• <strong>Document Issues:</strong> Record problems for future improvement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* For Attendants */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">👤 For Attendants</h2>
            
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Viewing Your Assignments</h3>
                <div className="space-y-3">
                  <p className="text-gray-600">Access your assignment information through:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• <strong>Personal Dashboard:</strong> See all current and upcoming assignments</li>
                    <li>• <strong>Event Details:</strong> View specific event information and requirements</li>
                    <li>• <strong>Contact Information:</strong> Find your overseer and keyman contacts</li>
                    <li>• <strong>Schedule Changes:</strong> Receive notifications about updates</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Information Includes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Event Details</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Event name and type</li>
                      <li>• Date and time</li>
                      <li>• Location and venue</li>
                      <li>• Duration and breaks</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Your Role</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Position title and duties</li>
                      <li>• Shift times and rotations</li>
                      <li>• Special instructions</li>
                      <li>• Contact information</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Responsibilities</h3>
                <div className="space-y-3">
                  <p className="text-gray-600">As an assigned attendant, you should:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• <strong>Confirm Availability:</strong> Respond promptly to assignment notifications</li>
                    <li>• <strong>Arrive Early:</strong> Check in at least 15 minutes before your shift</li>
                    <li>• <strong>Follow Instructions:</strong> Adhere to position guidelines and protocols</li>
                    <li>• <strong>Communicate Issues:</strong> Report problems or conflicts immediately</li>
                    <li>• <strong>Stay Professional:</strong> Maintain appropriate dress and conduct</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🔧 Common Issues</h2>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">❗ Last-Minute Cancellations</h3>
                <p className="text-yellow-800 text-sm mb-2">When attendants can't fulfill their assignments:</p>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• Contact backup attendants immediately</li>
                  <li>• Redistribute assignments if necessary</li>
                  <li>• Update the system to reflect changes</li>
                  <li>• Communicate changes to affected parties</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Scheduling Conflicts</h3>
                <p className="text-yellow-800 text-sm mb-2">When multiple assignments overlap:</p>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• Review all assignments for conflicts</li>
                  <li>• Prioritize critical positions</li>
                  <li>• Reassign less critical roles</li>
                  <li>• Consider splitting shifts or rotations</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">🚫 Insufficient Coverage</h3>
                <p className="text-yellow-800 text-sm mb-2">When not enough attendants are available:</p>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• Reach out to additional qualified attendants</li>
                  <li>• Consider combining similar positions</li>
                  <li>• Adjust shift lengths or rotations</li>
                  <li>• Recruit from other congregations if needed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Best Practices */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-900 mb-4">✅ Best Practices</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-green-800 mb-3">For Overseers & Keymen</h3>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>• Plan assignments well in advance</li>
                  <li>• Maintain a pool of backup attendants</li>
                  <li>• Provide clear job descriptions</li>
                  <li>• Follow up on assignment confirmations</li>
                  <li>• Document lessons learned for future events</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-green-800 mb-3">For Attendants</h3>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>• Check assignments regularly</li>
                  <li>• Confirm availability promptly</li>
                  <li>• Arrive prepared and on time</li>
                  <li>• Communicate issues early</li>
                  <li>• Be flexible and willing to help</li>
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
