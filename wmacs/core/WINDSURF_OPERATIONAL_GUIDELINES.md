# Windsurf Operational Guidelines & Guardrails

**WMACS Guardian System - Operational Standards for AI-Driven Development**

## Core Principles

### 1. Research-Backed Decision Making
- **MANDATORY**: All architectural suggestions must pass WMACS Research Advisor analysis
- **NO EXCEPTIONS**: Decisions affecting system reliability require industry validation
- **DOCUMENTATION**: All overrides must include documented reasoning with evidence

### 2. Battle-Tested Deployment Pipeline
- **STAGING FIRST**: All changes must be validated in staging environment
- **CODE PARITY**: Production deployments use exact staging codebase
- **NO SHORTCUTS**: CI/CD pipeline cannot be bypassed for "faster" deployment

### 3. Multi-Agent Coordination Standards
- **QOS OVERSIGHT**: QOS Agent monitors all agent operations for hanging/timeout issues
- **ERROR RECOVERY**: Automatic fallback procedures for failed operations
- **TESTING COORDINATION**: Comprehensive test coverage across all environments

## Operational Guardrails

### 🚫 PROHIBITED ACTIONS (Auto-Reject)

1. **Bypassing CI/CD Pipeline**
   ```
   ❌ "Let's copy files directly to production"
   ❌ "We can skip staging for this small change"
   ❌ "Manual deployment will be faster"
   ```
   **Trigger**: WMACS Research Advisor auto-pushback
   **Alternative**: Use proper staging → production workflow

2. **Removing Multi-Agent Systems Without Analysis**
   ```
   ❌ "Remove multi-agent system for token efficiency"
   ❌ "Single agent is simpler to maintain"
   ❌ "We don't need specialized agents"
   ```
   **Trigger**: Industry standards violation detection
   **Alternative**: Agent consolidation with maintained specialization

3. **Architectural Changes Without Research**
   ```
   ❌ "Switch database without impact analysis"
   ❌ "Change authentication system quickly"
   ❌ "Remove error handling to simplify code"
   ```
   **Trigger**: High-risk pattern detection
   **Alternative**: Comprehensive impact analysis with alternatives

### ⚠️ REQUIRES ANALYSIS (Research Advisor Review)

1. **Performance Optimizations**
   - Token usage optimizations
   - Database query improvements
   - Caching implementations
   **Process**: Cost-benefit analysis with long-term impact assessment

2. **Technology Stack Changes**
   - Framework migrations
   - Library replacements
   - Infrastructure updates
   **Process**: Industry standards validation with migration planning

3. **Security Modifications**
   - Authentication changes
   - Authorization updates
   - Data handling modifications
   **Process**: Security best practices review with compliance validation

### ✅ APPROVED PATTERNS (Fast-Track)

1. **WMACS Guardian Synchronization**
   ```
   ✅ "Synchronize WMACS Guardian across repositories"
   ✅ "Update shared WMACS implementation"
   ✅ "Implement git submodule for WMACS"
   ```
   **Reasoning**: Industry best practice, DRY principle, operational reliability

2. **Proper CI/CD Implementation**
   ```
   ✅ "Deploy exact staging code to production"
   ✅ "Implement battle-tested deployment pipeline"
   ✅ "Maintain code parity between environments"
   ```
   **Reasoning**: User-emphasized requirement, industry standard

3. **QOS Agent Integration**
   ```
   ✅ "Add QOS monitoring for agent operations"
   ✅ "Implement automatic error recovery"
   ✅ "Coordinate testing oversight"
   ```
   **Reasoning**: User-specified requirement for Phase 2 development

## Agent Coordination Standards

### QOS Agent Responsibilities
- **PRIMARY**: Monitor all agent operations for hanging/timeout issues
- **SECONDARY**: Implement automatic error recovery and alternative solutions
- **TERTIARY**: Provide testing oversight and quality assurance coordination

### Agent Hierarchy
```
QOS Agent (Oversight)
├── Lead Architect Agent (Architecture decisions)
├── Backend Agent (API/Database operations)
├── Frontend Agent (UI/UX implementation)
├── QA Agent (Testing and validation)
└── Integration Agent (Deployment and CI/CD)
```

### Communication Protocols
1. **Status Reporting**: All agents report status to QOS Agent every 30 seconds
2. **Error Escalation**: Failed operations escalate to QOS Agent within 60 seconds
3. **Recovery Coordination**: QOS Agent coordinates recovery strategies across agents

## Environment-Specific Guidelines

### JW Attendant Scheduler
- **Containers**: 132 (production), 135 (staging)
- **Database**: PostgreSQL Container 131
- **Ports**: 3001 (Django application)
- **Recovery**: Django/Gunicorn process management

### LDC Construction Tools
- **Containers**: 134 (production), 135 (staging)
- **Database**: PostgreSQL Container 131
- **Ports**: 3001 (Next.js), 8000 (FastAPI)
- **Recovery**: Next.js/FastAPI process management

## Compliance Requirements

### USLDC-2829-E Compliance (LDC Construction Tools)
- **Personnel Contact Responsibilities**: All 192 role positions must be supported
- **Trade Crew Management**: All 42 trade crews must be properly managed
- **Workflow Compliance**: Assignment workflows must follow USLDC standards
- **Tracker System**: No approval workflows, only tracking and documentation

### Development Standards
- **TypeScript**: All new code must use TypeScript with strict type checking
- **API Contracts**: OpenAPI specifications required for all endpoints
- **Testing**: Minimum 80% code coverage for critical paths
- **Documentation**: All modules require SDD-compliant specifications

## Monitoring and Alerting

### WMACS Guardian Monitoring
- **Deadlock Detection**: Automatic detection within 60 seconds
- **Recovery Triggers**: Force recovery after 2 minutes of failed attempts
- **Health Checks**: Container and service health validation every 30 seconds

### Alert Escalation
1. **Level 1**: Automatic recovery attempt
2. **Level 2**: QOS Agent intervention
3. **Level 3**: Manual intervention required (logged for analysis)

## Knowledge Management

### Learning System
- **Mistake Recording**: All failures recorded in WMACS knowledge base
- **Pattern Recognition**: Automatic detection of recurring issues
- **Solution Evolution**: Continuous improvement of recovery strategies

### Documentation Requirements
- **Decision Rationale**: All architectural decisions must include reasoning
- **Alternative Analysis**: Document why alternatives were rejected
- **Impact Assessment**: Long-term consequences of changes

## Enforcement Mechanisms

### Automatic Enforcement
1. **WMACS Research Advisor**: Automatic analysis of all suggestions
2. **Anti-Pattern Detection**: Real-time identification of problematic patterns
3. **Pushback Generation**: Automatic resistance to high-risk suggestions

### Manual Review Triggers
- High-impact architectural changes
- Security-related modifications
- Performance optimization requests
- Multi-environment deployment changes

## Emergency Procedures

### System Recovery
1. **Container Restart**: Automatic container restart for deadlocked systems
2. **Service Recovery**: Process-level recovery for application failures
3. **Database Recovery**: Connection pool reset and query optimization

### Escalation Path
1. **WMACS Guardian**: Automatic recovery attempt
2. **QOS Agent**: Coordinated recovery strategy
3. **Manual Intervention**: Human oversight for complex failures

---

**Compliance Level**: MANDATORY  
**Review Frequency**: Weekly  
**Last Updated**: 2025-09-18  
**Enforcement**: WMACS Research Advisor + QOS Agent
# WMACS Enhancement - Tue Sep 23 19:17:20 EDT 2025
