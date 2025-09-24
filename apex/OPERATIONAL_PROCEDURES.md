# APEX Guardian Operational Procedures

**Standard Operating Procedures for APEX-Protected Development**

## Daily Operations

### Morning Startup Checklist
1. **APEX System Health Check**
   ```bash
   cd ~/Documents/Cloudy-Work/shared/wmacs-guardian-system
   ./health-check.sh
   ```

2. **Project Synchronization Verification**
   ```bash
   # Verify all projects have latest APEX version
   ./verify-sync.sh
   ```

3. **Knowledge Base Review**
   ```bash
   # Check for new patterns or issues from previous day
   node wmacs-research-advisor.js review-learnings
   ```

### Development Workflow

#### Starting New Development Work
1. **Environment Validation**
   ```bash
   # In project directory
   node wmacs/wmacs-guardian.js start staging
   ```

2. **Research Advisor Activation**
   ```bash
   # Enable real-time monitoring
   node wmacs/wmacs-auto-advisor.js monitor &
   ```

3. **QOS Agent Coordination**
   - Verify QOS Agent is monitoring all operations
   - Confirm error recovery mechanisms are active
   - Validate testing oversight is operational

#### Making Architectural Decisions
1. **Pre-Decision Analysis**
   ```bash
   node wmacs/wmacs-research-advisor.js analyze "your architectural suggestion"
   ```

2. **Industry Standards Validation**
   - Review research advisor recommendations
   - Document reasoning for any overrides
   - Consider long-term maintenance implications

3. **Alternative Evaluation**
   - Assess all suggested alternatives
   - Perform cost-benefit analysis
   - Choose approach with best research backing

#### Deployment Procedures
1. **Staging First Validation**
   ```bash
   # Deploy to staging
   node wmacs/wmacs-guardian.js start staging
   # Validate functionality
   node wmacs/wmacs-guardian.js test staging
   ```

2. **Code Parity Verification**
   ```bash
   # Ensure exact staging code goes to production
   ./verify-code-parity.sh staging production
   ```

3. **Production Deployment**
   ```bash
   # Only after staging validation
   node wmacs/wmacs-guardian.js start production
   ```

## Weekly Maintenance

### APEX System Updates
1. **Master Repository Updates**
   ```bash
   cd ~/Documents/Cloudy-Work/shared/wmacs-guardian-system
   git pull origin main
   ```

2. **Project Synchronization**
   ```bash
   ./sync-wmacs.sh
   ```

3. **Testing Validation**
   ```bash
   # Test in each project
   cd applications/jw-attendant-scheduler
   node wmacs/wmacs-guardian.js test
   
   cd applications/ldc-construction-tools
   node wmacs/wmacs-guardian.js test
   ```

### Knowledge Base Maintenance
1. **Pattern Analysis Review**
   - Analyze blocked commands and pushback events
   - Identify new anti-patterns
   - Update detection rules

2. **False Positive Resolution**
   - Review incorrectly flagged actions
   - Refine pattern matching rules
   - Update knowledge base

3. **Success Metrics Evaluation**
   - Measure prevented issues
   - Assess system effectiveness
   - Plan improvements

## Emergency Procedures

### System Recovery
1. **APEX Guardian Failure**
   ```bash
   # Force restart Guardian system
   pkill -f wmacs-guardian
   node wmacs/wmacs-guardian.js start --force-recovery
   ```

2. **Research Advisor Unavailable**
   ```bash
   # Manual analysis mode
   echo "Research Advisor offline - manual validation required"
   # Proceed with extra caution
   ```

3. **Container Deadlock**
   ```bash
   # Nuclear option - container restart
   ssh root@10.92.0.5 "pct stop [container] && pct start [container]"
   ```

### Emergency Override Protocol
1. **Incident Declaration**
   - Document business impact
   - Specify time-sensitive requirements
   - Identify rollback procedures

2. **Override Execution**
   ```bash
   # Emergency override with full logging
   APEX_EMERGENCY_OVERRIDE=true node wmacs/wmacs-guardian.js emergency-mode
   ```

3. **Post-Emergency Actions**
   - Conduct root cause analysis
   - Update prevention mechanisms
   - Document lessons learned

## Troubleshooting Guide

### Common Issues

#### APEX Guardian Not Starting
**Symptoms**: Guardian fails to initialize
**Diagnosis**:
```bash
node wmacs/wmacs-guardian.js diagnose
```
**Resolution**:
1. Check container connectivity
2. Verify SSH access
3. Validate configuration files

#### Research Advisor False Positives
**Symptoms**: Valid suggestions flagged as anti-patterns
**Diagnosis**: Review analysis reasoning
**Resolution**:
1. Update pattern matching rules
2. Add positive pattern recognition
3. Refine knowledge base

#### Synchronization Failures
**Symptoms**: Projects have different APEX versions
**Diagnosis**:
```bash
./verify-sync.sh --verbose
```
**Resolution**:
1. Force synchronization
2. Resolve file conflicts
3. Validate all projects

### Performance Issues

#### High Resource Usage
**Symptoms**: APEX processes consuming excessive resources
**Diagnosis**: Monitor process usage
**Resolution**:
1. Optimize monitoring intervals
2. Reduce logging verbosity
3. Implement resource limits

#### Slow Response Times
**Symptoms**: Research advisor analysis taking too long
**Diagnosis**: Profile analysis performance
**Resolution**:
1. Cache frequent analyses
2. Optimize pattern matching
3. Parallel processing implementation

## Compliance Monitoring

### Audit Procedures
1. **Monthly Compliance Review**
   - Verify all enforcement mechanisms active
   - Review override justifications
   - Validate operational procedures

2. **Quarterly System Assessment**
   - Evaluate system effectiveness
   - Update operational guidelines
   - Plan system improvements

3. **Annual Security Review**
   - Assess security implications
   - Update access controls
   - Validate emergency procedures

### Reporting Requirements
1. **Daily Status Reports**
   - System health metrics
   - Blocked actions summary
   - Performance indicators

2. **Weekly Analysis Reports**
   - Pattern detection effectiveness
   - False positive rates
   - User feedback summary

3. **Monthly Compliance Reports**
   - Operational guideline adherence
   - Emergency override usage
   - System improvement recommendations

## Training and Documentation

### New Team Member Onboarding
1. **APEX System Overview**
   - Core concepts and architecture
   - Operational guidelines understanding
   - Hands-on system interaction

2. **Practical Training**
   - Development workflow with APEX
   - Emergency procedures practice
   - Troubleshooting scenarios

3. **Certification Requirements**
   - Pass APEX operational test
   - Demonstrate emergency procedures
   - Complete compliance training

### Continuous Education
1. **Monthly Training Sessions**
   - New features and updates
   - Best practices sharing
   - Case study reviews

2. **Quarterly Workshops**
   - Advanced troubleshooting
   - System optimization techniques
   - Industry standards updates

3. **Annual Certification Renewal**
   - Updated procedures testing
   - Emergency response drills
   - Compliance requirement updates

---

**Procedure Version**: 1.0  
**Effective Date**: 2025-09-18  
**Review Cycle**: Monthly  
**Compliance**: MANDATORY for all development activities
