// WMACS Guardian Configuration Template
// Copy this file to your project root as 'wmacs-config.js' and customize

module.exports = {
  // Project identification
  projectName: 'your-project-name',
  projectType: 'nextjs|django|fastapi|other', // Helps with recovery strategies
  
  // Environment configuration
  environments: {
    staging: {
      container: '135',
      ip: '10.92.3.25',
      ports: {
        frontend: 3001,
        backend: 8000,
        database: 5432
      }
    },
    production: {
      container: '133',
      ip: '10.92.3.23',
      ports: {
        frontend: 3001,
        backend: 8000,
        database: 5432
      }
    }
  },
  
  // Container management
  containers: ['133', '135'], // Production, Staging
  proxmoxHost: '10.92.0.5',
  
  // Process management
  processes: {
    frontend: {
      name: 'npm start|python manage.py runserver',
      healthCheck: 'curl -f http://localhost:3001/',
      logFile: '/var/log/frontend.log'
    },
    backend: {
      name: 'uvicorn|gunicorn',
      healthCheck: 'curl -f http://localhost:8000/health',
      logFile: '/var/log/backend.log'
    }
  },
  
  // Recovery strategies
  recovery: {
    maxRetries: 3,
    timeoutMs: 30000,
    forceRecoveryAfter: 120000, // 2 minutes
    
    // Custom recovery functions
    customStrategies: {
      // Example: Custom database connection recovery
      databaseRecovery: async function(container) {
        // Custom implementation
      },
      
      // Example: Custom cache clearing
      cacheRecovery: async function(container) {
        // Custom implementation
      }
    }
  },
  
  // Research Advisor configuration
  researchAdvisor: {
    knowledgeBasePath: '.wmacs/knowledge-base.json',
    autoAnalysis: true,
    pushbackThreshold: 'medium', // low|medium|high
    
    // Project-specific patterns
    positivePatterns: [
      'proper ci/cd implementation',
      'battle-tested deployment',
      'staging first development'
    ],
    
    riskPatterns: [
      'bypass staging',
      'manual production deployment',
      'skip testing'
    ]
  },
  
  // Monitoring configuration
  monitoring: {
    healthCheckInterval: 5000,
    alertThresholds: {
      responseTime: 5000,
      errorRate: 0.05,
      memoryUsage: 0.85
    }
  },
  
  // Project-specific compliance requirements
  compliance: {
    // Example: USLDC-2829-E for LDC Construction Tools
    standards: [],
    requiredTests: [],
    documentationRequirements: []
  }
};
