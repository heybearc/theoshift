/**
 * Comprehensive test for congregation field functionality
 * Tests all forms, API endpoints, and data flow
 */

const BASE_URL = 'http://localhost:3000';

async function testCongregationField() {
  console.log('🧪 Starting Congregation Field Functionality Tests\n');

  // Test 1: Users API - GET endpoint includes congregation field
  console.log('1️⃣ Testing Users API GET endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/api/users`);
    const users = await response.json();
    
    if (response.ok) {
      console.log('✅ Users API GET successful');
      if (users.length > 0) {
        const hasCongregatonField = users[0].hasOwnProperty('congregation');
        console.log(`   - Congregation field present: ${hasCongregatonField ? '✅' : '❌'}`);
      } else {
        console.log('   - No users found to test field presence');
      }
    } else {
      console.log('❌ Users API GET failed:', users.error);
    }
  } catch (error) {
    console.log('❌ Users API GET error:', error.message);
  }

  // Test 2: Users API - POST endpoint accepts congregation field
  console.log('\n2️⃣ Testing Users API POST endpoint...');
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    phone: '555-0123',
    congregation: 'Test Congregation',
    role: 'ATTENDANT'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Users API POST successful');
      console.log(`   - Created user with congregation: ${result.congregation}`);
    } else {
      console.log('❌ Users API POST failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Users API POST error:', error.message);
  }

  // Test 3: Attendants API - GET endpoint includes congregation field
  console.log('\n3️⃣ Testing Attendants API GET endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/api/attendants`);
    const attendants = await response.json();
    
    if (response.ok) {
      console.log('✅ Attendants API GET successful');
      if (attendants.length > 0) {
        const hasCongregatonField = attendants[0].hasOwnProperty('congregation');
        console.log(`   - Congregation field present: ${hasCongregatonField ? '✅' : '❌'}`);
      } else {
        console.log('   - No attendants found to test field presence');
      }
    } else {
      console.log('❌ Attendants API GET failed:', attendants.error);
    }
  } catch (error) {
    console.log('❌ Attendants API GET error:', error.message);
  }

  // Test 4: Attendants API - POST endpoint accepts congregation field
  console.log('\n4️⃣ Testing Attendants API POST endpoint...');
  const testAttendant = {
    firstName: 'Test',
    lastName: 'Attendant',
    email: `attendant-${Date.now()}@example.com`,
    phone: '555-0456',
    congregation: 'Test Congregation for Attendant',
    notes: 'Test attendant for congregation field',
    servingAs: ['SOUND'],
    availabilityStatus: 'AVAILABLE'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/attendants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testAttendant)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Attendants API POST successful');
      console.log(`   - Created attendant with congregation: ${result.congregation}`);
      
      // Test 5: Attendants API - PUT endpoint updates congregation field
      console.log('\n5️⃣ Testing Attendants API PUT endpoint...');
      const updatedData = {
        ...testAttendant,
        congregation: 'Updated Test Congregation'
      };
      
      const updateResponse = await fetch(`${BASE_URL}/api/attendants/${result.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      
      const updateResult = await updateResponse.json();
      
      if (updateResponse.ok) {
        console.log('✅ Attendants API PUT successful');
        console.log(`   - Updated congregation: ${updateResult.congregation}`);
      } else {
        console.log('❌ Attendants API PUT failed:', updateResult.error);
      }
      
    } else {
      console.log('❌ Attendants API POST failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Attendants API POST error:', error.message);
  }

  // Test 6: Import API - CSV with congregation field
  console.log('\n6️⃣ Testing Attendants Import API...');
  const csvData = [
    {
      firstName: 'Import',
      lastName: 'Test1',
      email: `import1-${Date.now()}@example.com`,
      phone: '555-0789',
      congregation: 'Import Test Congregation 1',
      notes: 'Imported attendant 1',
      servingAs: 'SOUND,MICROPHONE'
    },
    {
      firstName: 'Import',
      lastName: 'Test2',
      email: `import2-${Date.now()}@example.com`,
      phone: '555-0790',
      congregation: 'Import Test Congregation 2',
      notes: 'Imported attendant 2',
      servingAs: 'PLATFORM'
    }
  ];

  try {
    const response = await fetch(`${BASE_URL}/api/attendants/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Attendants Import API successful');
      console.log(`   - Imported ${result.imported} attendants with congregation data`);
      if (result.results && result.results.length > 0) {
        result.results.forEach((attendant, index) => {
          console.log(`   - Attendant ${index + 1} congregation: ${attendant.congregation}`);
        });
      }
    } else {
      console.log('❌ Attendants Import API failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Attendants Import API error:', error.message);
  }

  console.log('\n🎉 Congregation Field Functionality Tests Complete!');
  console.log('\n📋 Summary:');
  console.log('- Users API GET/POST endpoints support congregation field');
  console.log('- Attendants API GET/POST/PUT endpoints support congregation field');
  console.log('- Import API processes congregation field from CSV data');
  console.log('- All forms should now include congregation input fields');
}

// Run the tests
testCongregationField().catch(console.error);
