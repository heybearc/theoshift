# Deployment Documentation

**INTERNAL DOCUMENTATION - FOR DEVELOPMENT TEAM ONLY**

This directory contains technical deployment details, infrastructure information, and internal procedures that should **NOT** be included in public-facing release notes.

---

## 📁 Directory Structure

```
docs/deployment/
├── README.md                           # This file
├── v2.2.1-technical-details.md        # Example technical deployment doc
└── [future deployment docs]
```

---

## 🎯 Purpose

This documentation is for:
- ✅ Development team
- ✅ DevOps team
- ✅ System administrators
- ✅ Internal stakeholders

This documentation is **NOT** for:
- ❌ End users
- ❌ Public release notes
- ❌ External stakeholders

---

## 📝 What Goes Here

### ✅ Include in Deployment Docs:

- **Infrastructure Details**
  - IP addresses and container numbers
  - Server configurations
  - Network topology
  
- **Technical Implementation**
  - Code-level changes
  - File paths and references
  - Database schema modifications
  - API endpoint changes
  
- **Deployment Procedures**
  - Step-by-step deployment commands
  - Blue-Green deployment specifics
  - Rollback procedures
  - Validation checklists
  
- **Monitoring & Operations**
  - Health check endpoints
  - Logging configurations
  - Performance metrics
  - Alert thresholds

### ❌ Keep Out of Public Release Notes:

All of the above! Public release notes should focus on user impact only.

---

## 🔄 Workflow

### When Creating a New Release:

1. **Write User-Facing Release Notes**
   - Location: `/release-notes/vX.Y.Z.md`
   - Use template: `/release-notes/TEMPLATE.md`
   - Focus: User benefits and impact
   - Language: Plain, non-technical

2. **Write Technical Deployment Docs** (if needed)
   - Location: `/docs/deployment/vX.Y.Z-technical-details.md`
   - Include: All technical details
   - Audience: Development team
   - Language: Technical, detailed

3. **Commit Both**
   - Public release notes go to `/release-notes/`
   - Technical docs stay in `/docs/deployment/`
   - Users only see release notes
   - Team has full technical context

---

## 📚 Related Documentation

- **Public Release Notes:** `/release-notes/` - User-facing
- **Release Notes Template:** `/release-notes/TEMPLATE.md` - How to write user-focused notes
- **GitHub Commits:** Git history - Developer-level changes
- **Technical Docs:** `/docs/technical/` - Architecture and design decisions

---

## 🏢 Enterprise Best Practice

This separation follows enterprise SaaS best practices:

- **Slack:** Public changelog vs internal deployment docs
- **GitHub:** Release notes vs deployment procedures
- **Notion:** User updates vs technical implementation
- **Atlassian:** Customer-facing vs internal operations

**Key Principle:** Users care about WHAT changed, not HOW it was implemented.

---

## 🔐 Security Note

This directory may contain sensitive information:
- Internal IP addresses
- Infrastructure topology
- Deployment procedures
- System configurations

**Do NOT:**
- Share publicly
- Include in public documentation
- Reference in user-facing materials
- Commit sensitive credentials (use environment variables)

---

## 📞 Questions?

- **About public release notes:** See `/release-notes/TEMPLATE.md`
- **About deployment procedures:** Ask DevOps team
- **About this structure:** Contact project lead

---

**Remember: Technical details here, user benefits in release notes!**
