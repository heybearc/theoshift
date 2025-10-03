#!/usr/bin/env node

/**
 * Functional UAT Test Suite - Tests specific functionality with authentication
 */

const UATTestRunner = require('./uat-automated');

class FunctionalUATRunner extends UATTestRunner {
  constructor(baseUrl = 'http://10.92.3.24:3001') {
    super(baseUrl);
    this.sessionCookie = null;
  }

  async authenticateAsAdmin() {
    console.log('\n🔐 Attempting Admin Authentication...');
    
    try {
      // Get signin page to extract any CSRF tokens
      const signinResponse = await this.runRequest('/auth/signin');
      
      // Attempt login with test credentials
      const loginData = {
        email: 'admin@jwscheduler.local',
        password: 'admin123',
        callbackUrl: '/'
      };
      
      const loginResponse = await this.runRequest('/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(loginData).toString()
      });
      
      // Extract session cookie if present
      const setCookie = loginResponse.headers['set-cookie'];
      if (setCookie) {
        this.sessionCookie = setCookie.find(cookie => cookie.includes('next-auth'));
      }
      
      this.logTest('Admin Authentication', 
        loginResponse.statusCode === 302 || loginResponse.statusCode === 200,
        `Status: ${loginResponse.statusCode}, Cookie: ${!!this.sessionCookie}`);
        
    } catch (error) {
      this.logTest('Admin Authentication', false, error.message);
    }
  }

  async testAuthenticatedRequest(path, expectedStatus = 200, testName = null) {
    const headers = {};
    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }
    
    try {
      const response = await this.runRequest(path, { headers });
      const testLabel = testName || `Authenticated ${path}`;
      this.logTest(testLabel, response.statusCode === expectedStatus,
        `Status: ${response.statusCode}, Expected: ${expectedStatus}`);
      return response;
    } catch (error) {
      this.logTest(testName || `Authenticated ${path}`, false, error.message);
      return null;
    }
  }

  async testEventManagement() {
    console.log('\n🔍 Testing Event Management Functionality...');
    
    // Test events list
    const eventsResponse = await this.testAuthenticatedRequest('/api/events', 200, 'Events List API');
    
    if (eventsResponse && eventsResponse.statusCode === 200) {
      try {
        const eventsData = JSON.parse(eventsResponse.body);
        this.logTest('Events Data Structure', 
          eventsData.success && Array.isArray(eventsData.data?.events),
          `Has success: ${!!eventsData.success}, Has events array: ${Array.isArray(eventsData.data?.events)}`);
          
        // Test if we have any events to work with
        const hasEvents = eventsData.data?.events?.length > 0;
        this.logTest('Events Available for Testing', hasEvents,
          `Event count: ${eventsData.data?.events?.length || 0}`);
          
        if (hasEvents) {
          const firstEvent = eventsData.data.events[0];
          await this.testEventDetail(firstEvent.id);
        }
      } catch (error) {
        this.logTest('Events Data Parsing', false, error.message);
      }
    }
  }

  async testEventDetail(eventId) {
    console.log(`\n🔍 Testing Event Detail Functionality (ID: ${eventId})...`);
    
    // Test event detail API
    const detailResponse = await this.testAuthenticatedRequest(`/api/events/${eventId}`, 200, 'Event Detail API');
    
    if (detailResponse && detailResponse.statusCode === 200) {
      try {
        const eventData = JSON.parse(detailResponse.body);
        this.logTest('Event Detail Data Structure',
          eventData.success && eventData.data,
          `Has success: ${!!eventData.success}, Has data: ${!!eventData.data}`);
          
        // Test event type enum values
        const hasNewEventTypes = ['CIRCUIT_ASSEMBLY', 'REGIONAL_CONVENTION', 'OTHER'].includes(eventData.data?.eventType);
        this.logTest('New Event Types in Data', hasNewEventTypes,
          `Event type: ${eventData.data?.eventType}`);
      } catch (error) {
        this.logTest('Event Detail Data Parsing', false, error.message);
      }
    }
    
    // Test event detail page
    await this.testAuthenticatedRequest(`/events/${eventId}`, 200, 'Event Detail Page');
    
    // Test tab pages
    const tabs = ['count-times', 'attendants', 'positions', 'assignments', 'edit'];
    for (const tab of tabs) {
      await this.testAuthenticatedRequest(`/events/${eventId}/${tab}`, 200, `Event ${tab} Tab`);
    }
    
    // Test lanyards admin page
    await this.testAuthenticatedRequest(`/admin/events/${eventId}/lanyards`, 200, 'Event Lanyards Admin Page');
  }

  async testEventCreation() {
    console.log('\n🔍 Testing Event Creation...');
    
    const newEventData = {
      name: `UAT Test Event ${Date.now()}`,
      description: 'Automated test event',
      eventType: 'CIRCUIT_ASSEMBLY',
      startDate: '2025-12-01',
      endDate: '2025-12-01',
      startTime: '09:30',
      endTime: '16:00',
      location: 'Test Location',
      status: 'UPCOMING'
    };
    
    const headers = { 'Content-Type': 'application/json' };
    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }
    
    try {
      const createResponse = await this.runRequest('/api/events', {
        method: 'POST',
        headers,
        body: JSON.stringify(newEventData)
      });
      
      this.logTest('Event Creation API', createResponse.statusCode === 201 || createResponse.statusCode === 200,
        `Status: ${createResponse.statusCode}`);
        
      if (createResponse.statusCode === 201 || createResponse.statusCode === 200) {
        try {
          const createdEvent = JSON.parse(createResponse.body);
          if (createdEvent.success && createdEvent.data?.id) {
            this.logTest('Event Creation Returns Valid Data', true,
              `Created event ID: ${createdEvent.data.id}`);
            return createdEvent.data.id;
          }
        } catch (error) {
          this.logTest('Event Creation Response Parsing', false, error.message);
        }
      }
    } catch (error) {
      this.logTest('Event Creation', false, error.message);
    }
    
    return null;
  }

  async testEventStatusChanges(eventId) {
    if (!eventId) return;
    
    console.log(`\n🔍 Testing Event Status Changes (ID: ${eventId})...`);
    
    const statusChanges = [
      { from: 'UPCOMING', to: 'CURRENT' },
      { from: 'CURRENT', to: 'COMPLETED' },
      { from: 'COMPLETED', to: 'ARCHIVED' }
    ];
    
    for (const change of statusChanges) {
      const headers = { 'Content-Type': 'application/json' };
      if (this.sessionCookie) {
        headers['Cookie'] = this.sessionCookie;
      }
      
      try {
        const updateResponse = await this.runRequest(`/api/events/${eventId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: change.to })
        });
        
        this.logTest(`Status Change ${change.from} → ${change.to}`,
          updateResponse.statusCode === 200,
          `Status: ${updateResponse.statusCode}`);
      } catch (error) {
        this.logTest(`Status Change ${change.from} → ${change.to}`, false, error.message);
      }
    }
  }

  async testAdminFunctionality() {
    console.log('\n🔍 Testing Admin Functionality...');
    
    // Test admin dashboard
    await this.testAuthenticatedRequest('/admin', 200, 'Admin Dashboard');
    
    // Test admin health check
    const healthResponse = await this.testAuthenticatedRequest('/api/admin/health', 200, 'Admin Health Check');
    
    if (healthResponse && healthResponse.statusCode === 200) {
      try {
        const healthData = JSON.parse(healthResponse.body);
        this.logTest('Database Connection Health',
          healthData.database === 'connected' || healthData.status === 'healthy',
          `DB Status: ${healthData.database || healthData.status}`);
      } catch (error) {
        this.logTest('Health Data Parsing', false, error.message);
      }
    }
    
    // Test user management
    await this.testAuthenticatedRequest('/api/admin/users', 200, 'User Management API');
    await this.testAuthenticatedRequest('/admin/users', 200, 'User Management Page');
  }

  async runFunctionalTests() {
    console.log('🚀 Starting Functional UAT Tests...');
    
    // First run basic connectivity tests
    await this.testBasicConnectivity();
    
    // Attempt authentication
    await this.authenticateAsAdmin();
    
    // Run authenticated tests
    await this.testEventManagement();
    await this.testAdminFunctionality();
    
    // Test event creation and lifecycle
    const createdEventId = await this.testEventCreation();
    if (createdEventId) {
      await this.testEventStatusChanges(createdEventId);
    }
    
    return this.generateReport();
  }
}

// Run functional tests if called directly
if (require.main === module) {
  const runner = new FunctionalUATRunner();
  runner.runFunctionalTests()
    .then(results => {
      console.log('\n🎯 FUNCTIONAL TEST COMPLETE');
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Functional test runner failed:', error);
      process.exit(1);
    });
}

module.exports = FunctionalUATRunner;
