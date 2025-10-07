const https = require('https')

// Test the bulk import API directly
async function testBulkImportAPI() {
  console.log('🛡️ APEX GUARDIAN - DIRECT BULK IMPORT API TEST')
  console.log('================================================')
  
  const testData = {
    attendants: [
      {
        firstName: "Eric",
        lastName: "Powell", 
        email: "changeme@changeme.com",
        phone: "216-339-6436",
        congregation: "West Bedford",
        formsOfService: ["Ministerial Servant"],
        isActive: true,
        notes: ""
      },
      {
        firstName: "Devan",
        lastName: "Thomas",
        email: "changeme2@changeme.com", 
        phone: "",
        congregation: "West Bedford",
        formsOfService: ["Ministerial Servant"],
        isActive: true,
        notes: ""
      }
    ],
    eventId: "d60272ad-9c14-4738-b201-20c29c4e59d5"
  }
  
  console.log('\n1. TESTING BULK IMPORT DATA STRUCTURE:')
  console.log(JSON.stringify(testData, null, 2))
  
  console.log('\n2. TESTING API ENDPOINT AVAILABILITY:')
  
  const options = {
    hostname: 'jw-staging.cloudigan.net',
    port: 443,
    path: '/api/events/d60272ad-9c14-4738-b201-20c29c4e59d5/attendants',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'APEX-Guardian-Test/1.0'
    }
  }
  
  const postData = JSON.stringify(testData)
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        console.log(`✅ API Response Status: ${res.statusCode}`)
        console.log(`✅ API Response Headers:`, res.headers)
        console.log(`✅ API Response Body:`, data)
        
        if (res.statusCode === 401) {
          console.log('\n🔐 AUTHENTICATION REQUIRED:')
          console.log('- This is expected for direct API calls')
          console.log('- The PUT method is working (not 405 Method Not Allowed)')
          console.log('- Frontend should work with proper session cookies')
        } else if (res.statusCode === 405) {
          console.log('\n❌ METHOD NOT ALLOWED:')
          console.log('- PUT method is not supported')
          console.log('- API deployment may have failed')
        } else {
          console.log('\n✅ API RESPONSE RECEIVED:')
          console.log('- API is responding to PUT requests')
        }
        
        resolve(data)
      })
    })
    
    req.on('error', (error) => {
      console.error('❌ API REQUEST FAILED:', error)
      reject(error)
    })
    
    req.write(postData)
    req.end()
  })
}

// Test CSV parsing logic
function testCSVParsing() {
  console.log('\n3. TESTING CSV PARSING LOGIC:')
  
  const csvData = `firstName,lastName,email,phone,congregation,formsOfService,isActive,notes
Eric,Powell,changeme@changeme.com,216-339-6436,West Bedford,Ministerial Servant,TRUE,
Devan,Thomas,changeme2@changeme.com,,West Bedford,Ministerial Servant,TRUE,`

  console.log('✅ Sample CSV Data:')
  console.log(csvData)
  
  const lines = csvData.trim().split('\n')
  const headers = lines[0].split(',')
  
  console.log('\n✅ Parsed Headers:')
  headers.forEach((header, index) => {
    console.log(`  ${index}: "${header}"`)
  })
  
  console.log('\n✅ Expected Headers:')
  const expectedHeaders = ['firstName', 'lastName', 'email', 'phone', 'congregation', 'formsOfService', 'isActive', 'notes']
  expectedHeaders.forEach((header, index) => {
    const matches = headers[index] === header
    console.log(`  ${index}: "${header}" ${matches ? '✅' : '❌'}`)
  })
  
  console.log('\n✅ Valid Forms of Service:')
  const validForms = ['Elder', 'Ministerial Servant', 'Exemplary', 'Regular Pioneer', 'Other Department']
  validForms.forEach(form => console.log(`  - "${form}"`))
}

async function runTests() {
  try {
    await testBulkImportAPI()
    testCSVParsing()
    
    console.log('\n🛡️ BULK IMPORT TEST COMPLETE')
    console.log('============================')
    console.log('NEXT STEPS:')
    console.log('1. Check browser console for detailed frontend errors')
    console.log('2. Verify session authentication is working')
    console.log('3. Try with exact CSV format shown above')
    console.log('4. Check network tab for actual API request/response')
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error)
  }
}

runTests()
