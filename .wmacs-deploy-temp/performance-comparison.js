#!/usr/bin/env node

/**
 * Performance Comparison: Next.js SDD vs Django Implementation
 * Comprehensive benchmarking and analysis tool
 */

const axios = require('axios');

const NEXTJS_BASE_URL = 'http://10.92.3.24:3001';
const DJANGO_BASE_URL = 'http://10.92.3.24:8001';

class PerformanceBenchmark {
    constructor() {
        this.results = {
            nextjs: {},
            django: {},
            comparison: {}
        };
    }

    async measureEndpoint(url, iterations = 5) {
        const times = [];
        let successCount = 0;
        
        for (let i = 0; i < iterations; i++) {
            try {
                const startTime = Date.now();
                const response = await axios.get(url, { timeout: 10000 });
                const endTime = Date.now();
                
                if (response.status === 200) {
                    times.push(endTime - startTime);
                    successCount++;
                }
            } catch (error) {
                console.log(`❌ Failed request to ${url}: ${error.message}`);
            }
        }
        
        if (times.length === 0) {
            return { error: 'All requests failed', successRate: 0 };
        }
        
        return {
            min: Math.min(...times),
            max: Math.max(...times),
            avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
            median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
            successRate: (successCount / iterations) * 100,
            samples: times.length
        };
    }

    async benchmarkNextJS() {
        console.log('🚀 Benchmarking Next.js SDD Implementation...');
        
        const endpoints = [
            { name: 'Homepage', url: `${NEXTJS_BASE_URL}/` },
            { name: 'Attendants API', url: `${NEXTJS_BASE_URL}/api/attendants` },
            { name: 'Events API', url: `${NEXTJS_BASE_URL}/api/events` },
            { name: 'Counts API', url: `${NEXTJS_BASE_URL}/api/counts` },
            { name: 'Attendants Page', url: `${NEXTJS_BASE_URL}/attendants` },
            { name: 'Events Page', url: `${NEXTJS_BASE_URL}/events` },
            { name: 'Counts Page', url: `${NEXTJS_BASE_URL}/counts` }
        ];
        
        for (const endpoint of endpoints) {
            console.log(`  Testing ${endpoint.name}...`);
            this.results.nextjs[endpoint.name] = await this.measureEndpoint(endpoint.url);
        }
    }

    async benchmarkDjango() {
        console.log('🐍 Benchmarking Django Implementation...');
        
        const endpoints = [
            { name: 'Homepage', url: `${DJANGO_BASE_URL}/` },
            { name: 'Events Page', url: `${DJANGO_BASE_URL}/events/` },
            { name: 'Login Page', url: `${DJANGO_BASE_URL}/login/` }
        ];
        
        for (const endpoint of endpoints) {
            console.log(`  Testing ${endpoint.name}...`);
            this.results.django[endpoint.name] = await this.measureEndpoint(endpoint.url);
        }
    }

    generateComparison() {
        console.log('\n📊 PERFORMANCE COMPARISON RESULTS');
        console.log('=' .repeat(80));
        
        // Compare common endpoints
        const commonEndpoints = ['Homepage'];
        
        for (const endpoint of commonEndpoints) {
            const nextjs = this.results.nextjs[endpoint];
            const django = this.results.django[endpoint];
            
            if (nextjs && django && !nextjs.error && !django.error) {
                const improvement = ((django.avg - nextjs.avg) / django.avg * 100).toFixed(1);
                
                console.log(`\n🔍 ${endpoint} Comparison:`);
                console.log(`  Next.js: ${nextjs.avg}ms (min: ${nextjs.min}ms, max: ${nextjs.max}ms)`);
                console.log(`  Django:  ${django.avg}ms (min: ${django.min}ms, max: ${django.max}ms)`);
                console.log(`  Performance: ${improvement > 0 ? '🚀' : '🐌'} ${Math.abs(improvement)}% ${improvement > 0 ? 'faster' : 'slower'}`);
                
                this.results.comparison[endpoint] = {
                    nextjs_avg: nextjs.avg,
                    django_avg: django.avg,
                    improvement_percent: parseFloat(improvement)
                };
            }
        }
        
        // Next.js specific features
        console.log('\n🎯 Next.js SDD Features Performance:');
        const nextjsFeatures = ['Attendants API', 'Events API', 'Counts API', 'Attendants Page', 'Events Page', 'Counts Page'];
        
        for (const feature of nextjsFeatures) {
            const result = this.results.nextjs[feature];
            if (result && !result.error) {
                console.log(`  ${feature}: ${result.avg}ms (${result.successRate}% success rate)`);
            }
        }
        
        // Calculate overall metrics
        const nextjsAvgs = Object.values(this.results.nextjs)
            .filter(r => r && !r.error)
            .map(r => r.avg);
        
        const djangoAvgs = Object.values(this.results.django)
            .filter(r => r && !r.error)
            .map(r => r.avg);
        
        if (nextjsAvgs.length > 0 && djangoAvgs.length > 0) {
            const nextjsOverall = Math.round(nextjsAvgs.reduce((a, b) => a + b, 0) / nextjsAvgs.length);
            const djangoOverall = Math.round(djangoAvgs.reduce((a, b) => a + b, 0) / djangoAvgs.length);
            const overallImprovement = ((djangoOverall - nextjsOverall) / djangoOverall * 100).toFixed(1);
            
            console.log('\n🏆 OVERALL PERFORMANCE SUMMARY:');
            console.log(`  Next.js Average: ${nextjsOverall}ms`);
            console.log(`  Django Average:  ${djangoOverall}ms`);
            console.log(`  Overall Performance: ${overallImprovement > 0 ? '🚀' : '🐌'} ${Math.abs(overallImprovement)}% ${overallImprovement > 0 ? 'faster' : 'slower'}`);
        }
    }

    async runFullBenchmark() {
        console.log('🎯 NEXT.JS SDD vs DJANGO PERFORMANCE BENCHMARK');
        console.log('=' .repeat(60));
        console.log(`Next.js URL: ${NEXTJS_BASE_URL}`);
        console.log(`Django URL:  ${DJANGO_BASE_URL}`);
        console.log('');
        
        const startTime = Date.now();
        
        await this.benchmarkNextJS();
        await this.benchmarkDjango();
        
        const endTime = Date.now();
        
        this.generateComparison();
        
        console.log('\n📈 ARCHITECTURE ANALYSIS:');
        console.log('  Next.js SDD Advantages:');
        console.log('    ✅ Modern TypeScript with type safety');
        console.log('    ✅ Client-side routing and caching');
        console.log('    ✅ Modular SDD library architecture');
        console.log('    ✅ API-first design with JSON responses');
        console.log('    ✅ Hot reloading and modern dev experience');
        
        console.log('\n  Django Advantages:');
        console.log('    ✅ Mature, battle-tested framework');
        console.log('    ✅ Built-in admin interface');
        console.log('    ✅ Comprehensive ORM with migrations');
        console.log('    ✅ Server-side rendering');
        
        console.log(`\n⏱️  Total benchmark time: ${endTime - startTime}ms`);
        console.log('🎉 Performance comparison completed!');
        
        return this.results;
    }
}

// Run the benchmark
if (require.main === module) {
    const benchmark = new PerformanceBenchmark();
    benchmark.runFullBenchmark().catch(console.error);
}

module.exports = PerformanceBenchmark;
