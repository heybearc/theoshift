# WMACS Guardian System

**Windsurf MCP Artifact CI/CD System (WMACS) Guardian**  
Universal deadlock detection and recovery system for AI-driven development environments.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/heybearc/wmacs-guardian-system/releases)
[![AI Development](https://img.shields.io/badge/AI-Development-green.svg)](https://github.com/heybearc/wmacs-guardian-system)

## Overview

This repository contains the master implementation of the WMACS Guardian system, designed to be shared across multiple projects through git submodules. The system provides:

- **Immutable Deadlock Detection**: Automatically detects and resolves development bottlenecks
- **Research-Backed Analysis**: Industry best practices validation with informed pushback
- **Auto-Recovery Systems**: Automatic error recovery and alternative solutions
- **Multi-Environment Support**: Configurable for different project environments

## Architecture

```
wmacs-guardian-system/
├── wmacs-guardian.js           # Core guardian implementation
├── wmacs-research-advisor.js   # Research-backed analysis system
├── wmacs-auto-advisor.js       # Automatic suggestion monitoring
├── config/                     # Environment-specific configurations
├── templates/                  # Project-specific templates
└── docs/                       # Documentation and guidelines
```

## Projects Using WMACS Guardian

1. **JW Attendant Scheduler** - Container-based Django application
2. **LDC Construction Tools** - Next.js/FastAPI application
3. **Future Projects** - Extensible to any development environment

## Usage as Git Submodule

### Adding to New Project
```bash
cd your-project-directory
git submodule add ../../../shared/wmacs-guardian-system wmacs
git submodule update --init --recursive
```

### Updating WMACS in Project
```bash
cd your-project-directory
git submodule update --remote wmacs
git add wmacs
git commit -m "Update WMACS Guardian to latest version"
```

### Project-Specific Configuration

Each project should create a `wmacs-config.js` file:

```javascript
// wmacs-config.js
module.exports = {
  projectName: 'your-project-name',
  containers: ['133', '135'], // Project-specific container IDs
  ports: [3001, 8000],        // Project-specific ports
  environments: {
    staging: '10.92.3.25',
    production: '10.92.3.23'
  },
  // Project-specific overrides
  customRecoveryStrategies: {
    // Custom recovery functions
  }
};
```

## Core Components

### 1. WMACS Guardian (`wmacs-guardian.js`)
- Deadlock detection and recovery
- Container management and restart capabilities
- Port conflict resolution
- Connection issue recovery
- Force recovery with timeout handling

### 2. Research Advisor (`wmacs-research-advisor.js`)
- Industry best practices analysis
- Anti-pattern detection
- Research-backed pushback system
- Alternative suggestion generation
- Knowledge base persistence

### 3. Auto Advisor (`wmacs-auto-advisor.js`)
- Automatic suggestion detection
- Real-time analysis triggering
- Conversation monitoring
- Analysis result persistence

## Environment Adaptation

The WMACS Guardian system automatically adapts to different project environments:

### JW Attendant Scheduler Environment
- Containers: 132 (production), 135 (staging)
- Ports: 3001 (Django), 5432 (PostgreSQL)
- Recovery: Django/Gunicorn process management

### LDC Construction Tools Environment
- Containers: 133 (production), 135 (staging)
- Ports: 3001 (Next.js), 8000 (FastAPI)
- Recovery: Next.js/FastAPI process management

## Operational Guidelines

### 1. Never Modify Core Files Directly in Projects
- All WMACS improvements should be made in this shared repository
- Projects should only contain configuration files and project-specific adapters

### 2. Version Control Best Practices
- Tag releases with semantic versioning (v1.0.0, v1.1.0, etc.)
- Maintain changelog for all updates
- Test changes in staging before updating production projects

### 3. Research-Backed Development
- All architectural changes must pass WMACS Research Advisor analysis
- Document reasoning for any overrides or exceptions
- Maintain knowledge base of decisions and outcomes

## Update Workflow

1. **Make Improvements in Shared Repo**
   ```bash
   cd ~/Documents/Cloudy-Work/shared/wmacs-guardian-system
   # Make changes
   git add .
   git commit -m "feat: Add new recovery strategy for X"
   git tag v1.2.0
   ```

2. **Update in All Projects**
   ```bash
   # JW Attendant Scheduler
   cd ~/Documents/Cloudy-Work/applications/jw-attendant-scheduler
   git submodule update --remote wmacs
   
   # LDC Construction Tools
   cd ~/Documents/Cloudy-Work/applications/ldc-construction-tools
   git submodule update --remote wmacs
   ```

3. **Test and Deploy**
   - Test in staging environments first
   - Validate all recovery mechanisms
   - Deploy to production with proper CI/CD

## Research Advisor Integration

The WMACS system includes built-in research advisor capabilities:

```bash
# Analyze suggestions with research backing
node wmacs/wmacs-research-advisor.js analyze "suggestion text"

# Monitor conversations for problematic patterns
node wmacs/wmacs-auto-advisor.js monitor "conversation text"
```

## Contributing

1. All changes must pass Research Advisor analysis
2. Include tests for new recovery strategies
3. Update documentation for new features
4. Follow semantic versioning for releases

## Support

For issues or questions about WMACS Guardian:
1. Check existing knowledge base in `.wmacs/knowledge-base.json`
2. Run research advisor analysis on proposed solutions
3. Document new patterns and solutions for future reference

---

**Version**: 1.0.0  
**Last Updated**: 2025-09-18  
**Maintainer**: Cloudy-Work Development Team
