import { useState } from 'react'

export default function TestDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const testAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/attendant/dashboard?attendantId=123&eventId=456')
      const result = await response.json()
      setData(result)
    } catch (error) {
      setData({ error: error.message })
    }
    setLoading(false)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard API Test</h1>
      <button 
        onClick={testAPI}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        disabled={loading}
      >
        {loading ? 'Testing...' : 'Test Dashboard API'}
      </button>
      
      {data && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
