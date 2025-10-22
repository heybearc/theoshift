const fetch = require('node-fetch')

async function testBulkCreateAPI() {
  console.log('🛡️ APEX GUARDIAN - TESTING BULK CREATE API DIRECTLY')
  console.log('==================================================')
  
  try {
    const eventId = 'd60272ad-9c14-4738-b201-20c29c4e59d5'
    const url = `http://localhost:3001/api/events/${eventId}/positions/bulk-create`
    
    const payload = {
      startNumber: 1,
      endNumber: 5,
      namePrefix: 'Position',
      area: 'Main Hall'
    }
    
    console.log('\n📝 Testing bulk create API:')
    console.log(`   URL: ${url}`)
    console.log(`   Payload:`, JSON.stringify(payload, null, 2))
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'test-session=admin'
      },
      body: JSON.stringify(payload)
    })
    
    console.log(`\n📊 Response Status: ${response.status}`)
    
    const data = await response.text()
    console.log(`📄 Response Body:`)
    console.log(data)
    
    if (response.status === 200 || response.status === 201) {
      console.log('\n✅ API TEST SUCCESSFUL')
    } else {
      console.log('\n❌ API TEST FAILED')
    }
    
  } catch (error) {
    console.error('❌ API TEST ERROR:', error.message)
  }
}

testBulkCreateAPI()
