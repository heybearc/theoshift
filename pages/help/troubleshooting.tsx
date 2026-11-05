import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import HelpLayout from '../../components/HelpLayout'
import Link from 'next/link'

export default function TroubleshootingPage() {
  return (
    <HelpLayout title="Troubleshooting">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Troubleshooting</h1>
          <p className="text-gray-600">
            Common issues and how to resolve them
          </p>
        </div>

        {/* Quick Solutions */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-red-900 mb-3">🚨 Quick Solutions</h2>
          <p className="text-red-800 mb-4">
            Try these common fixes first before seeking additional help:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="space-y-2 text-sm text-red-700">
              <li>• <strong>Refresh the page</strong> (Ctrl+F5 or Cmd+Shift+R)</li>
              <li>• <strong>Clear browser cache</strong> and cookies</li>
              <li>• <strong>Try a different browser</strong> (Chrome, Firefox, Safari)</li>
            </ul>
            <ul className="space-y-2 text-sm text-red-700">
              <li>• <strong>Check your internet connection</strong></li>
              <li>• <strong>Disable browser extensions</strong> temporarily</li>
              <li>• <strong>Update your browser</strong> to the latest version</li>
            </ul>
          </div>
        </div>

        <div className="space-y-8">
          {/* Login Issues */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🔐 Login & Authentication Issues</h2>
            
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">❌ Can't Sign In</h3>
                <div className="space-y-3">
                  <p className="text-gray-600"><strong>Symptoms:</strong> Login page shows error or doesn't accept credentials</p>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Solutions:</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• <strong>Check credentials:</strong> Verify email address and password are correct</li>
                      <li>• <strong>Reset password:</strong> Use the "Forgot Password" link if available</li>
                      <li>• <strong>Contact admin:</strong> Request account verification or password reset</li>
                      <li>• <strong>Check account status:</strong> Ensure your account is active and not suspended</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">⏱️ Session Timeout</h3>
                <div className="space-y-3">
                  <p className="text-gray-600"><strong>Symptoms:</strong> Automatically logged out or "Session expired" messages</p>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Solutions:</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• <strong>Sign in again:</strong> Sessions expire after 30 days of inactivity</li>
                      <li>• <strong>Lost phone:</strong> Open Phones signed in and sign that phone out. It stops the next time it reaches TheoShift.</li>
                      <li>• <strong>Stay active:</strong> Regular use prevents automatic logout</li>
                      <li>• <strong>Save work frequently:</strong> Don't lose data due to timeouts</li>
                      <li>• <strong>Use "Remember Me":</strong> If available, to extend session length</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🚫 Access Denied</h3>
                <div className="space-y-3">
                  <p className="text-gray-600"><strong>Symptoms:</strong> "Unauthorized" or "Access Denied" messages</p>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Solutions:</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• <strong>Check permissions:</strong> You may not have access to that feature</li>
                      <li>• <strong>Verify role:</strong> Some features are restricted by user role</li>
                      <li>• <strong>Contact overseer:</strong> Request additional permissions if needed</li>
                      <li>• <strong>Use correct login:</strong> Ensure you're using the right account type</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Issues */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">⚡ Performance Issues</h2>
            
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🐌 Slow Loading</h3>
                <div className="space-y-3">
                  <p className="text-gray-600"><strong>Symptoms:</strong> Pages take a long time to load or respond</p>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Solutions:</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• <strong>Check internet speed:</strong> Test your connection speed</li>
                      <li>• <strong>Close other tabs:</strong> Free up browser resources</li>
                      <li>• <strong>Clear cache:</strong> Remove stored files that may be corrupted</li>
                      <li>• <strong>Restart browser:</strong> Fresh start can resolve memory issues</li>
                      <li>• <strong>Try different time:</strong> System may be busy during peak hours</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💥 Page Crashes</h3>
                <div className="space-y-3">
                  <p className="text-gray-600"><strong>Symptoms:</strong> Browser crashes, freezes, or shows error pages</p>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Solutions:</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• <strong>Update browser:</strong> Use the latest version for stability</li>
                      <li>• <strong>Disable extensions:</strong> Add-ons can cause conflicts</li>
                      <li>• <strong>Check device memory:</strong> Close other applications</li>
                      <li>• <strong>Try incognito mode:</strong> Test without extensions or cache</li>
                      <li>• <strong>Restart device:</strong> Clear memory and temporary files</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data & Display Issues */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Data & Display Issues</h2>
            
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">❓ Missing Information</h3>
                <div className="space-y-3">
                  <p className="text-gray-600"><strong>Symptoms:</strong> Expected data, events, or assignments don't appear</p>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Solutions:</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• <strong>Check date range:</strong> Ensure you're looking at the correct time period</li>
                      <li>• <strong>Verify permissions:</strong> You may not have access to view certain data</li>
                      <li>• <strong>Refresh data:</strong> Use refresh button or reload the page</li>
                      <li>• <strong>Check filters:</strong> Clear any active filters that might hide data</li>
                      <li>• <strong>Contact admin:</strong> Data may need to be added or updated</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🔄 Outdated Information</h3>
                <div className="space-y-3">
                  <p className="text-gray-600"><strong>Symptoms:</strong> Information appears old or doesn't reflect recent changes</p>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Solutions:</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• <strong>Hard refresh:</strong> Force reload with Ctrl+F5 (PC) or Cmd+Shift+R (Mac)</li>
                      <li>• <strong>Clear browser cache:</strong> Remove stored outdated files</li>
                      <li>• <strong>Check last update time:</strong> Look for timestamps on data</li>
                      <li>• <strong>Wait for sync:</strong> Changes may take a few minutes to appear</li>
                      <li>• <strong>Verify source:</strong> Ensure changes were actually saved</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📱 Mobile Display Issues</h3>
                <div className="space-y-3">
                  <p className="text-gray-600"><strong>Symptoms:</strong> Layout problems on phones or tablets</p>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Solutions:</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• <strong>Rotate device:</strong> Try landscape and portrait orientations</li>
                      <li>• <strong>Zoom adjustment:</strong> Pinch to zoom or use browser zoom controls</li>
                      <li>• <strong>Update mobile browser:</strong> Use latest version of Chrome, Safari, etc.</li>
                      <li>• <strong>Close other apps:</strong> Free up device memory</li>
                      <li>• <strong>Use desktop version:</strong> Access full site on computer if needed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature-Specific Issues */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🛠️ Feature-Specific Issues</h2>
            
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📎 File Upload Problems</h3>
                <div className="space-y-3">
                  <p className="text-gray-600"><strong>Symptoms:</strong> Can't upload files or uploads fail</p>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Solutions:</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• <strong>Check file size:</strong> Maximum 10MB per file</li>
                      <li>• <strong>Verify file type:</strong> Only images, PDFs, and documents allowed</li>
                      <li>• <strong>Rename file:</strong> Remove special characters from filename</li>
                      <li>• <strong>Try different format:</strong> Convert to supported file type</li>
                      <li>• <strong>Check connection:</strong> Ensure stable internet for upload</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💬 Feedback System Issues</h3>
                <div className="space-y-3">
                  <p className="text-gray-600"><strong>Symptoms:</strong> Can't submit feedback or comments</p>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Solutions:</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• <strong>Check required fields:</strong> Ensure all mandatory fields are filled</li>
                      <li>• <strong>Verify feedback status:</strong> Can only comment on active feedback</li>
                      <li>• <strong>Try without files:</strong> Submit text-only first, then add files</li>
                      <li>• <strong>Check character limits:</strong> Keep descriptions reasonable length</li>
                      <li>• <strong>Save draft:</strong> Copy text before submitting in case of errors</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Browser Compatibility */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🌐 Browser Compatibility</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Supported Browsers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">✅ Fully Supported</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• <strong>Chrome</strong> (version 90+)</li>
                    <li>• <strong>Firefox</strong> (version 88+)</li>
                    <li>• <strong>Safari</strong> (version 14+)</li>
                    <li>• <strong>Edge</strong> (version 90+)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-700 mb-2">⚠️ Limited Support</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• <strong>Internet Explorer</strong> (not recommended)</li>
                    <li>• <strong>Older mobile browsers</strong></li>
                    <li>• <strong>Browsers with JavaScript disabled</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Getting Help */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">🆘 Getting Additional Help</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-blue-800 mb-2">When to Contact Support</h3>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• Problems persist after trying troubleshooting steps</li>
                  <li>• Error messages you don't understand</li>
                  <li>• Need additional permissions or access</li>
                  <li>• System-wide issues affecting multiple users</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-blue-800 mb-2">How to Report Issues</h3>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• Use the feedback system to report bugs</li>
                  <li>• Include screenshots when possible</li>
                  <li>• Describe steps to reproduce the problem</li>
                  <li>• Mention your browser and device type</li>
                </ul>
              </div>
              
              <div className="pt-4 border-t border-blue-200">
                <Link href="/help/feedback" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block">
                  Submit Feedback / Report Issue
                </Link>
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
    props: {},
  }
}
