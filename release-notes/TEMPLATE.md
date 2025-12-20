# Release Notes Template

**Use this template when creating new release notes. Focus on USER IMPACT, not technical implementation.**

---

## Template File: `release-notes/vX.Y.Z.md`

```markdown
---
version: X.Y.Z
date: YYYY-MM-DD
type: major|minor|patch
title: Brief User-Friendly Title
description: One sentence describing the main focus of this release
---

## ✨ New Features (if any)

- **Feature Name** - Brief description of what users can now do
- **Another Feature** - How this benefits users

## 🐛 Bug Fixes (if any)

- **Fixed [issue]** - Describe what was broken and is now fixed
- **Resolved [problem]** - User-facing description of the fix

## 🔧 Improvements (if any)

- **Better [thing]** - How the experience is improved
- **Enhanced [feature]** - What's better for users

## ⚠️ Breaking Changes (if any - rare!)

- **[Change]** - What changed and what users need to do
- **Action Required** - Clear steps for users to take

## 📝 Notes (optional)

- Additional context or information users should know
- Migration notes if applicable
- Known limitations or workarounds

```

---

## ✅ DO's - User-Focused Language

### ✅ Good Examples:

- "Fixed issue where removing attendants would fail"
- "Improved dashboard loading speed"
- "Added ability to export assignments to PDF"
- "Enhanced mobile experience with better touch controls"
- "Resolved notification delay issues"

### ✅ Focus On:
- What users can now do
- What problems were fixed
- How their experience improved
- Any actions they need to take

---

## ❌ DON'Ts - Technical Implementation Details

### ❌ Bad Examples:

- "Corrected Prisma schema relationship from `position` to `positions`"
- "File: `pages/api/events/[id]/assignments.ts`"
- "Deployed to Blue environment (10.92.3.22:3001)"
- "Container 132 (green-theoshift)/133 updated"
- "Updated TypeScript interfaces"
- "Refactored database queries"

### ❌ Avoid:
- IP addresses and container numbers
- File paths and code references
- Internal infrastructure details
- Deployment procedures
- Technical jargon
- Database schema details
- API endpoint paths (unless user-facing)

---

## 📊 Version Type Guidelines

### Major (X.0.0)
- Breaking changes that require user action
- Major new features
- Significant UI/UX changes
- Example: v2.0.0 → v3.0.0

### Minor (0.X.0)
- New features (backward compatible)
- Significant improvements
- New capabilities
- Example: v2.1.0 → v2.2.0

### Patch (0.0.X)
- Bug fixes
- Small improvements
- Performance enhancements
- Example: v2.2.1 → v2.2.2

---

## 🎯 Writing Tips

1. **Use Plain Language** - Write for non-technical users
2. **Be Specific** - "Fixed assignment errors" not just "Bug fixes"
3. **Show Benefits** - Explain WHY it matters to users
4. **Be Concise** - One clear sentence per item
5. **Use Emojis** - Makes it more scannable and friendly
6. **Test Readability** - Would your grandma understand it?

---

## 📝 Example Release Note (Good)

```markdown
---
version: 2.3.0
date: 2025-11-01
type: minor
title: PDF Export and Mobile Improvements
description: Export assignments to PDF and enhanced mobile experience
---

## ✨ New Features

- **PDF Export** - Export event assignments to PDF for printing or sharing
- **Mobile Gestures** - Swipe to quickly remove assignments on mobile devices

## 🐛 Bug Fixes

- **Fixed notification delays** - Notifications now arrive immediately
- **Resolved calendar sync issues** - Events now sync correctly with external calendars

## 🔧 Improvements

- **Faster page loading** - Pages now load 50% faster
- **Better mobile layout** - Improved touch targets and spacing on small screens

## 📝 Notes

All improvements are automatic - no action required from users.
```

---

## 📚 Where Technical Details Go

### GitHub Commit Messages
```
git commit -m "fix: Correct Prisma schema relationship

- Changed position to positions in assignments API
- Updated files: pages/api/events/[id]/assignments.ts
- Fixes #123"
```

### Internal Deployment Docs
See `docs/deployment/` for:
- Blue-Green deployment procedures
- IP addresses and infrastructure
- Validation checklists
- Rollback procedures

### Developer Documentation
See `docs/technical/` for:
- API changes
- Database schema updates
- Architecture decisions
- Code-level changes

---

## 🚀 Quick Checklist Before Publishing

- [ ] No IP addresses or container numbers
- [ ] No file paths or code references
- [ ] No internal infrastructure details
- [ ] Written in plain, user-friendly language
- [ ] Focused on user benefits and impact
- [ ] Emojis used for scannability
- [ ] Spell-checked and proofread
- [ ] Would make sense to a non-technical user

---

**Remember: Release notes are for USERS, not developers!**
