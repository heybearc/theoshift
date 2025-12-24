# Phase 3B: Dynamic Event Experience - Implementation Plan

## Overview
Implement template-driven UI rendering so events dynamically show/hide features based on their department template configuration.

## Architecture Changes

### 1. Event Data Enhancement
- Events already have `departmentTemplateId` field
- Need to fetch department template config with event data
- Pass template config to all event pages

### 2. Dynamic Navigation Component
Create `EventNavigation` component that:
- Reads template's `moduleConfig`
- Shows/hides navigation items based on enabled modules
- Applies custom terminology from template

### 3. Template Context Provider
Create React context to share template config across event pages:
```typescript
interface TemplateContext {
  moduleConfig: ModuleConfig | null
  terminology: Terminology | null
  positionTemplates: PositionTemplate[] | null
}
```

## Implementation Steps

### Step 1: Enhance Event API to Include Template Config
**File:** `/pages/api/events/[id].ts`
- Include department template with moduleConfig, terminology, positionTemplates
- Return full template configuration with event data

### Step 2: Create Template Context
**File:** `/contexts/TemplateContext.tsx`
- Create context and provider
- Export hooks: `useTemplateConfig()`, `useTerminology()`, `useModuleConfig()`

### Step 3: Create Dynamic Event Navigation Component
**File:** `/components/EventNavigation.tsx`
- Replace hardcoded Quick Actions
- Read moduleConfig to determine which links to show
- Apply terminology overrides to labels

### Step 4: Update Event Detail Page
**File:** `/pages/events/[id]/index.tsx`
- Wrap with TemplateProvider
- Replace hardcoded Quick Actions with EventNavigation component
- Pass template config to child components

### Step 5: Create Position Template Loader
**File:** `/components/PositionTemplateLoader.tsx`
- Modal to select and apply position templates
- Bulk create positions from template
- Integrate into positions page

### Step 6: Update Event Creation Flow
**File:** `/pages/events/create.tsx`
- Add department template selector
- Show template preview
- Apply module config on creation

### Step 7: Apply Terminology Throughout UI
- Update all hardcoded labels ("Volunteer", "Position", "Shift", "Assignment")
- Use terminology context hooks
- Fallback to defaults if no custom terminology

## Module Visibility Rules

### Count Times Module
- **Enabled:** Show "Count Times" in navigation
- **Disabled:** Hide "Count Times" link and page access

### Lanyards Module
- **Enabled:** Show "Lanyards" in navigation
- **Disabled:** Hide "Lanyards" link and page access

### Positions Module
- **Always Enabled:** Cannot be disabled
- Show "Manage Positions" in navigation
- Show position template quick-setup if templates exist

### Custom Fields Module
- **Enabled:** Show custom fields in event forms
- **Disabled:** Hide custom field sections

## Terminology Mapping

Default → Custom (if defined):
- "Volunteer" → terminology.volunteer
- "Position" → terminology.position
- "Shift" → terminology.shift
- "Assignment" → terminology.assignment

## Testing Checklist

### Module Toggles
- [ ] Count Times enabled: Link visible, page accessible
- [ ] Count Times disabled: Link hidden, page returns 404
- [ ] Lanyards enabled: Link visible, page accessible
- [ ] Lanyards disabled: Link hidden, page returns 404
- [ ] Positions always visible

### Terminology
- [ ] Custom "Volunteer" label appears throughout UI
- [ ] Custom "Position" label appears throughout UI
- [ ] Custom "Shift" label appears throughout UI
- [ ] Custom "Assignment" label appears throughout UI
- [ ] Defaults used when no custom terminology

### Position Templates
- [ ] Template selector appears on positions page
- [ ] Selecting template creates positions
- [ ] Template positions have correct names and capacity
- [ ] Multiple templates can be applied

### Event Creation
- [ ] Department template selector appears
- [ ] Selecting template shows preview
- [ ] Created event has correct moduleConfig
- [ ] Navigation reflects selected template

## Backward Compatibility

Events without department template:
- Show all modules (default behavior)
- Use default terminology
- No position templates available

## Files to Create
1. `/contexts/TemplateContext.tsx` - Template configuration context
2. `/components/EventNavigation.tsx` - Dynamic navigation component
3. `/components/PositionTemplateLoader.tsx` - Position template selector
4. `/hooks/useTemplateConfig.ts` - Template configuration hooks
5. `/lib/templateHelpers.ts` - Template utility functions

## Files to Modify
1. `/pages/api/events/[id].ts` - Include template config
2. `/pages/events/[id]/index.tsx` - Use dynamic navigation
3. `/pages/events/[id]/count-times.tsx` - Check module access
4. `/pages/events/[id]/lanyards.tsx` - Check module access
5. `/pages/events/[id]/positions.tsx` - Add template loader
6. `/pages/events/create.tsx` - Add template selector

## Success Criteria
- ✅ Events with Attendants template show Count Times + Lanyards
- ✅ Events with Baptism template hide Lanyards
- ✅ Events with Parking template hide Count Times + Lanyards
- ✅ Custom terminology appears consistently
- ✅ Position templates create positions with one click
- ✅ Backward compatible with existing events
