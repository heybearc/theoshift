export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        JW Attendant Scheduler Dashboard
      </h1>
      <p className="text-xl text-gray-600">
        Simple test page - WMACS Guardian Phase 4
      </p>
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">System Status</h2>
        <ul className="space-y-2">
          <li>✅ Dashboard Route Working</li>
          <li>✅ Next.js 15 Compilation</li>
          <li>✅ Tailwind CSS Styling</li>
          <li>✅ Container 134 Deployment</li>
        </ul>
      </div>
    </div>
  );
}
