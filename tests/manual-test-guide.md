# Manual Testing Guide

## 🎯 Quick Verification Tests

### Test 1: Basic Login & Navigation
1. **Go to**: http://10.92.3.24:3001
2. **Login with**: admin@jwscheduler.local / admin123
3. **Verify**: Should redirect to event selection or dashboard
4. **Expected**: No errors, proper styling visible

### Test 2: Event Management
1. **Navigate to**: Events Management
2. **Check**: Event type filter dropdown
3. **Expected**: Should show "Circuit Assembly, Regional Convention, Special Event, Other"
4. **Test**: Create new event with new event types

### Test 3: Event Detail Navigation  
1. **Open any event** from the events list
2. **Check tabs**: Count Times, Attendants, Positions, Assignments, Lanyards, Edit Event
3. **Expected**: All tabs should be clickable and load properly
4. **Test**: Lanyards tab should work (new addition)

### Test 4: Quick Actions
1. **On event detail page**, check Quick Actions sidebar
2. **Expected actions**:
   - 🚀 Start Event (if UPCOMING)
   - ✅ Complete Event (if CURRENT)  
   - 📊 Export Data
   - 🖨️ Print Report
   - 📋 Clone Event
   - 🗑️ Archive Event (if COMPLETED)

### Test 5: Status Workflow
1. **Find UPCOMING event**
2. **Click "Start Event"** in Quick Actions
3. **Verify**: Status changes to CURRENT
4. **Click "Complete Event"**
5. **Verify**: Status changes to COMPLETED
6. **Check**: Archive option appears

## 🐛 Issues to Watch For

### Authentication Issues
- [ ] Login redirects properly
- [ ] Sessions persist across pages
- [ ] Protected pages accessible after login

### Event Type Issues  
- [ ] New event types in dropdowns
- [ ] Event creation works with new types
- [ ] Existing events display correct types

### Navigation Issues
- [ ] All tabs load without errors
- [ ] Lanyards tab accessible
- [ ] Quick Actions buttons work
- [ ] No 500 errors on any page

### Data Issues
- [ ] Dates display correctly (no timezone shifts)
- [ ] Status changes persist
- [ ] Event data saves properly

## 🚨 Critical Test Results

**If any of these fail, report immediately:**
1. **Cannot login** - Authentication broken
2. **500 errors** - Server/database issues  
3. **Missing styling** - CSS/build problems
4. **Data not saving** - Database connectivity issues
5. **Tabs not loading** - Navigation broken

## ✅ Success Criteria

**All tests pass when:**
- ✅ Login works smoothly
- ✅ All event types available
- ✅ All tabs load properly  
- ✅ Quick Actions function correctly
- ✅ Status changes work
- ✅ No console errors
- ✅ Proper styling throughout
