# Apex Guardian System Migration Plan - JW Attendant Scheduler

**Upgrading from current CI/CD to improved Apex Guardian System**

## 🎯 Current State Analysis

### **Current Issues:**

1. **❌ Confusing Branch Structure**
   - `staging` branch
   - `main` branch
   - `production-gold-standard` branch
   - Unclear which is production-ready

2. **❌ Auto-Deploys to Production**
   - Violates approval requirement
   - No manual gate before production
   - `deploy-production` job runs automatically

3. **❌ No Blue-Green in GitHub Actions**
   - Doesn't use MCP blue-green deployment tools
   - Manual HAProxy switching
   - No automated traffic management

4. **❌ Self-Hosted Runner Complexity**
   - Runs on Container 134 itself
   - Deployment script embedded in workflow
   - Hard to maintain

5. **❌ Hardcoded Secrets**
   - Database URLs in workflow
   - JWT secrets in workflow
   - Should use GitHub Secrets properly

---

## ✅ Target State (Apex Guardian System)

### **Improved Architecture:**

1. **✅ Clean Branch Strategy**
   - `main` = production-ready code
   - `feature/*` = development branches
   - Remove `staging` and `production-gold-standard`

2. **✅ Proper Approval Gates**
   - Feature branches → Auto-deploy to STANDBY
   - Main branch → Auto-deploy to STANDBY
   - Production → Manual workflow + GitHub approval

3. **✅ MCP Integration**
   - Use `jw-blue-green-deployment` MCP server
   - Automated traffic switching
   - Intelligent STANDBY identification

4. **✅ Standard GitHub Runner**
   - Use ubuntu-latest runner
   - Deploy via SSH to containers
   - Cleaner, more maintainable

5. **✅ Proper Secrets Management**
   - All secrets in GitHub Secrets
   - No hardcoded values
   - Environment-specific configs

---

## 📋 Migration Steps

### **Phase 1: Preparation** (No Downtime)

1. **Create new GitHub Actions workflow**
   ```bash
   # Create new workflow alongside existing
   .github/workflows/apex-guardian.yml
   ```

2. **Test new workflow**
   - Deploy to STANDBY using new workflow
   - Verify builds work
   - Test deployment process
   - Validate health checks

3. **Document new process**
   - Create APEX_GUARDIAN_SYSTEM.md
   - Update README.md
   - Create migration guide

### **Phase 2: Branch Cleanup** (Requires Coordination)

1. **Merge all feature branches**
   ```bash
   # Merge or close all open feature branches
   git checkout production-gold-standard
   git merge feature/announcements-merge
   git merge feature/phase2-rebranding
   # etc.
   ```

2. **Consolidate to main**
   ```bash
   # Make main the single source of truth
   git checkout main
   git merge production-gold-standard
   git push origin main
   ```

3. **Delete old branches**
   ```bash
   # After confirming main is correct
   git branch -d staging
   git branch -d production-gold-standard
   git push origin --delete staging
   git push origin --delete production-gold-standard
   ```

### **Phase 3: Cutover** (Brief Coordination)

1. **Disable old workflow**
   ```bash
   # Rename or delete old workflow
   mv .github/workflows/mcp-ci-cd.yml .github/workflows/mcp-ci-cd.yml.old
   ```

2. **Enable new workflow**
   ```bash
   # Ensure apex-guardian.yml is active
   git add .github/workflows/apex-guardian.yml
   git commit -m "feat: Enable Apex Guardian System"
   git push origin main
   ```

3. **Test complete cycle**
   - Create test feature branch
   - Push to trigger deployment
   - Verify STANDBY deployment
   - Test release workflow
   - Test sync workflow

### **Phase 4: Cleanup** (Post-Migration)

1. **Remove old workflow**
   ```bash
   rm .github/workflows/mcp-ci-cd.yml.old
   ```

2. **Update documentation**
   - Update all references to old workflow
   - Update deployment guides
   - Update team documentation

3. **Archive old branches**
   ```bash
   # Create backup tags
   git tag archive/staging-$(date +%Y%m%d) staging
   git tag archive/production-gold-standard-$(date +%Y%m%d) production-gold-standard
   git push --tags
   ```

---

## 🔄 New Workflow Comparison

### **Old Workflow:**
```
1. Push to staging → Auto-deploys to Container 134
2. Push to main → Auto-deploys to Container 132 ❌
3. Manual HAProxy edit to switch traffic
```

### **New Workflow (Apex Guardian):**
```
1. Push to feature/* → Auto-deploys to STANDBY ✅
2. Push to main → Auto-deploys to STANDBY ✅
3. Manual "release-to-prod" → Requires approval → MCP switches traffic ✅
4. Manual "sync-standby" → Updates new STANDBY ✅
```

---

## 🎯 Key Improvements

### **1. Safety**
- ✅ No auto-deploy to production
- ✅ Approval gates enforced
- ✅ Always test on STANDBY first

### **2. Clarity**
- ✅ Single main branch
- ✅ Clear feature branch workflow
- ✅ Obvious production path

### **3. Automation**
- ✅ MCP-based traffic switching
- ✅ Automated health checks
- ✅ Intelligent STANDBY identification

### **4. Maintainability**
- ✅ Standard GitHub runners
- ✅ Clean workflow files
- ✅ Proper secrets management

---

## ⚠️ Migration Risks & Mitigation

### **Risk 1: Branch Confusion**
**Mitigation:**
- Document current state before migration
- Create backup tags
- Test new workflow in parallel first

### **Risk 2: Deployment Disruption**
**Mitigation:**
- Migrate during low-traffic period
- Keep old workflow available as backup
- Test thoroughly before cutover

### **Risk 3: Lost Work in Feature Branches**
**Mitigation:**
- Audit all feature branches before cleanup
- Merge or document all work
- Create archive tags

---

## 📊 Success Criteria

### **Must Have:**
- ✅ New workflow deploys successfully to STANDBY
- ✅ Manual release workflow works
- ✅ Sync workflow works
- ✅ Health checks pass
- ✅ No auto-deploy to production

### **Should Have:**
- ✅ Clean branch structure (main + feature/*)
- ✅ MCP integration working
- ✅ Documentation complete
- ✅ Team trained on new workflow

### **Nice to Have:**
- ✅ Improved deployment speed
- ✅ Better error messages
- ✅ Enhanced monitoring

---

## 🗓️ Recommended Timeline

### **Week 1: Preparation**
- Day 1-2: Create new workflow
- Day 3-4: Test new workflow
- Day 5: Document new process

### **Week 2: Testing**
- Day 1-3: Parallel testing (old + new)
- Day 4-5: Team review and feedback

### **Week 3: Migration**
- Day 1: Branch cleanup
- Day 2: Cutover to new workflow
- Day 3-5: Monitor and adjust

---

## 📝 Checklist

### **Pre-Migration:**
- [ ] New workflow created
- [ ] New workflow tested on STANDBY
- [ ] Documentation complete
- [ ] Team informed
- [ ] Backup tags created

### **Migration:**
- [ ] Feature branches merged or archived
- [ ] Branches consolidated to main
- [ ] Old branches deleted
- [ ] Old workflow disabled
- [ ] New workflow enabled

### **Post-Migration:**
- [ ] Complete deployment cycle tested
- [ ] Health checks verified
- [ ] Team trained
- [ ] Documentation updated
- [ ] Old workflow removed

---

## 🆘 Rollback Plan

### **If Issues Arise:**

1. **Immediate Rollback:**
   ```bash
   # Re-enable old workflow
   git checkout HEAD~1 .github/workflows/
   git commit -m "Rollback to old workflow"
   git push origin main
   ```

2. **Restore Branches:**
   ```bash
   # Restore from archive tags
   git checkout -b staging archive/staging-YYYYMMDD
   git push origin staging
   ```

3. **Manual Deployment:**
   ```bash
   # Deploy manually if needed
   ssh root@10.92.3.24 "cd /opt/jw-attendant-scheduler && git pull && npm run build && pm2 restart jw-attendant"
   ```

---

## 📚 Next Steps

1. **Review this plan** with team
2. **Create new workflow** in separate branch
3. **Test thoroughly** before migration
4. **Schedule migration** during low-traffic period
5. **Execute migration** following this plan
6. **Monitor closely** post-migration

---

## 🎉 Expected Benefits

### **Immediate:**
- Safer deployments
- No accidental production deploys
- Clear approval process

### **Short-term:**
- Faster development cycle
- Better testing workflow
- Reduced deployment errors

### **Long-term:**
- Consistent deployment across all apps
- Easier onboarding for new developers
- Professional, maintainable infrastructure

---

**Ready to migrate when you are!** 🚀
