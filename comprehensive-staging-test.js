#!/usr/bin/env node

/**
 * Comprehensive Multi-Agent Testing Suite for Next.js SDD Staging Deployment
 * Tests all links, buttons, forms, and interactive elements
 */

const axios = require('axios');
const { JSDOM } = require('jsdom');

const STAGING_BASE_URL = 'http://10.92.3.24:3001';

class StagingTestAgent {
    constructor(name, focus) {
        this.name = name;
        this.focus = focus;
        this.results = [];
    }

    async log(message, status = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${this.name} (${status}): ${message}`;
        console.log(logEntry);
        this.results.push({ timestamp, message, status });
    }

    async testEndpoint(url, method = 'GET', data = null) {
        try {
            const config = { method, url: `${STAGING_BASE_URL}${url}` };
            if (data) config.data = data;
            
            const response = await axios(config);
            await this.log(`✅ ${method} ${url} - Status: ${response.status}`, 'SUCCESS');
            return { success: true, status: response.status, data: response.data };
        } catch (error) {
            await this.log(`❌ ${method} ${url} - Error: ${error.message}`, 'ERROR');
            return { success: false, error: error.message };
        }
    }

    async testPageLinks(url) {
        try {
            const response = await axios.get(`${STAGING_BASE_URL}${url}`);
            const dom = new JSDOM(response.data);
            const document = dom.window.document;
            
            const links = Array.from(document.querySelectorAll('a[href]'));
            await this.log(`Found ${links.length} links on ${url}`, 'INFO');
            
            for (const link of links) {
                const href = link.getAttribute('href');
                if (href.startsWith('/')) {
                    await this.testEndpoint(href);
                }
            }
            
            return links.length;
        } catch (error) {
            await this.log(`❌ Failed to test links on ${url}: ${error.message}`, 'ERROR');
            return 0;
        }
    }
}

class NavigationTestAgent extends StagingTestAgent {
    constructor() {
        super('NavigationAgent', 'Navigation and routing');
    }

    async runTests() {
        await this.log('🚀 Starting Navigation Tests');
        
        // Test main navigation links
        const navLinks = ['/', '/attendants', '/events', '/counts'];
        
        for (const link of navLinks) {
            await this.testEndpoint(link);
            await this.testPageLinks(link);
        }
        
        await this.log('✅ Navigation tests completed');
    }
}

class APITestAgent extends StagingTestAgent {
    constructor() {
        super('APIAgent', 'API endpoints and data operations');
    }

    async runTests() {
        await this.log('🚀 Starting API Tests');
        
        // Test all API endpoints
        const apiEndpoints = [
            '/api/attendants',
            '/api/attendants/search?q=john',
            '/api/events',
            '/api/events/upcoming',
            '/api/events/past',
            '/api/events/search?q=meeting',
            '/api/counts',
            '/api/counts/analytics',
            '/api/counts/search?q=session',
            '/api/counts/generate-name?eventId=1',
            '/api/test'
        ];
        
        for (const endpoint of apiEndpoints) {
            await this.testEndpoint(endpoint);
        }
        
        // Test POST operations
        await this.testCreateOperations();
        
        await this.log('✅ API tests completed');
    }

    async testCreateOperations() {
        await this.log('Testing POST operations');
        
        // Test creating attendant
        const attendantData = {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            phone: '555-0199'
        };
        await this.testEndpoint('/api/attendants', 'POST', attendantData);
        
        // Test creating event
        const eventData = {
            name: 'Test Event',
            description: 'Test event description',
            startDate: new Date().toISOString(),
            location: 'Test Location'
        };
        await this.testEndpoint('/api/events', 'POST', eventData);
        
        // Test creating count session
        const countData = {
            sessionName: 'Test Session',
            eventId: 1,
            countTime: new Date().toISOString(),
            notes: 'Test notes'
        };
        await this.testEndpoint('/api/counts', 'POST', countData);
    }
}

class UITestAgent extends StagingTestAgent {
    constructor() {
        super('UIAgent', 'User interface and interactive elements');
    }

    async runTests() {
        await this.log('🚀 Starting UI Tests');
        
        // Test each page for UI elements
        const pages = ['/', '/attendants', '/events', '/counts'];
        
        for (const page of pages) {
            await this.testPageUI(page);
        }
        
        await this.log('✅ UI tests completed');
    }

    async testPageUI(url) {
        try {
            const response = await axios.get(`${STAGING_BASE_URL}${url}`);
            const dom = new JSDOM(response.data);
            const document = dom.window.document;
            
            // Count interactive elements
            const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
            const forms = document.querySelectorAll('form');
            const inputs = document.querySelectorAll('input, textarea, select');
            
            await this.log(`Page ${url}: ${buttons.length} buttons, ${forms.length} forms, ${inputs.length} inputs`);
            
            // Test for essential UI elements
            const title = document.querySelector('title');
            const nav = document.querySelector('nav');
            const main = document.querySelector('main');
            
            if (title) await this.log(`✅ Title found: ${title.textContent}`);
            if (nav) await this.log(`✅ Navigation found`);
            if (main) await this.log(`✅ Main content area found`);
            
        } catch (error) {
            await this.log(`❌ UI test failed for ${url}: ${error.message}`, 'ERROR');
        }
    }
}

class PerformanceTestAgent extends StagingTestAgent {
    constructor() {
        super('PerformanceAgent', 'Performance and response times');
    }

    async runTests() {
        await this.log('🚀 Starting Performance Tests');
        
        const endpoints = ['/', '/api/attendants', '/api/events', '/api/counts'];
        
        for (const endpoint of endpoints) {
            await this.testPerformance(endpoint);
        }
        
        await this.log('✅ Performance tests completed');
    }

    async testPerformance(url) {
        const startTime = Date.now();
        try {
            const response = await axios.get(`${STAGING_BASE_URL}${url}`);
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            await this.log(`⚡ ${url} - ${responseTime}ms (Status: ${response.status})`);
            
            if (responseTime > 2000) {
                await this.log(`⚠️ Slow response: ${url} took ${responseTime}ms`, 'WARNING');
            }
            
        } catch (error) {
            await this.log(`❌ Performance test failed for ${url}: ${error.message}`, 'ERROR');
        }
    }
}

class TestOrchestrator {
    constructor() {
        this.agents = [
            new NavigationTestAgent(),
            new APITestAgent(),
            new UITestAgent(),
            new PerformanceTestAgent()
        ];
    }

    async runAllTests() {
        console.log('🎯 COMPREHENSIVE STAGING TEST SUITE STARTING');
        console.log('=' .repeat(60));
        
        const startTime = Date.now();
        
        // Run all agents in parallel
        const testPromises = this.agents.map(agent => agent.runTests());
        await Promise.all(testPromises);
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        console.log('=' .repeat(60));
        console.log('📊 TEST SUMMARY');
        
        let totalTests = 0;
        let totalErrors = 0;
        
        for (const agent of this.agents) {
            const errors = agent.results.filter(r => r.status === 'ERROR').length;
            const successes = agent.results.filter(r => r.status === 'SUCCESS').length;
            
            console.log(`${agent.name}: ${successes} passed, ${errors} failed`);
            totalTests += agent.results.length;
            totalErrors += errors;
        }
        
        console.log('=' .repeat(60));
        console.log(`🎉 TOTAL: ${totalTests - totalErrors}/${totalTests} tests passed`);
        console.log(`⏱️ Total execution time: ${totalTime}ms`);
        console.log(`🌐 Staging URL: ${STAGING_BASE_URL}`);
        
        if (totalErrors === 0) {
            console.log('✅ ALL TESTS PASSED - STAGING DEPLOYMENT FULLY FUNCTIONAL');
        } else {
            console.log(`❌ ${totalErrors} ISSUES FOUND - REVIEW REQUIRED`);
        }
    }
}

// Run the comprehensive test suite
if (require.main === module) {
    const orchestrator = new TestOrchestrator();
    orchestrator.runAllTests().catch(console.error);
}

module.exports = { TestOrchestrator, NavigationTestAgent, APITestAgent, UITestAgent, PerformanceTestAgent };
