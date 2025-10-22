# APEX GUARDIAN SSR Architecture Upgrade

## 🛡️ APEX GUARDIAN PRINCIPLES

### **Simple**
- Single data-fetching pattern: Server-side only
- Eliminate hybrid SSR/CSR complexity
- Consistent architecture across all tabs

### **Stable** 
- No client-side session authentication issues
- Predictable server-side data flow
- Reliable error handling with proper HTTP status codes

### **Secure**
- Server-side authentication validation
- Direct database access (no API layer vulnerabilities)
- Session handling at server level only

### **Industry Best Practices**
- Next.js SSR with getServerSideProps
- Prisma ORM for type-safe database access
- Proper error boundaries and fallbacks

## 📋 UPGRADE STRATEGY

### **Phase 1: High Priority Tabs**
1. **Attendants Tab** - Most complex, highest usage
2. **Positions Tab** - Core functionality
3. **Assignments Tab** - Critical workflow

### **Phase 2: Supporting Tabs**
4. **Lanyards Tab** - Administrative feature
5. **Count Times Tab** - Reporting feature

### **SSR Pattern Template**

```typescript
// getServerSideProps pattern
export const getServerSideProps: GetServerSideProps = async (context) => {
  // 1. Authentication check
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session) {
    return { redirect: { destination: '/auth/signin', permanent: false } }
  }

  // 2. Extract parameters
  const { id } = context.params!
  
  // 3. Fetch data server-side
  try {
    const { prisma } = await import('../../../src/lib/prisma')
    const data = await prisma.events.findUnique({
      where: { id: id as string },
      include: { /* specific relations */ }
    })

    if (!data) {
      return { notFound: true }
    }

    // 4. Transform for client
    return {
      props: {
        eventId: id as string,
        data: transformData(data)
      }
    }
  } catch (error) {
    console.error('SSR Error:', error)
    return { notFound: true }
  }
}
```

### **Component Pattern**

```typescript
interface TabPageProps {
  eventId: string
  data: TransformedData
}

export default function TabPage({ eventId, data }: TabPageProps) {
  // No useEffect for data fetching
  // No client-side API calls
  // Pure rendering with server-provided data
  
  return (
    <EventLayout>
      <TabComponent data={data} />
    </EventLayout>
  )
}
```

## 🔧 IMPLEMENTATION CHECKLIST

### **For Each Tab:**
- [ ] Remove client-side data fetching hooks
- [ ] Implement getServerSideProps with Prisma
- [ ] Add proper error handling (notFound, redirect)
- [ ] Transform data for client consumption
- [ ] Update component to use props instead of hooks
- [ ] Test authentication and data flow
- [ ] Verify post-build with verification script

### **Quality Gates:**
- [ ] Build compiles without errors
- [ ] All TypeScript types resolved
- [ ] Post-build verification passes
- [ ] Manual testing of tab functionality
- [ ] No client-side API calls remaining

## 📊 SUCCESS METRICS

- ✅ All tabs load without "Event Not Found" errors
- ✅ Consistent authentication flow across tabs
- ✅ Faster page load times (single request)
- ✅ No 500 internal server errors
- ✅ Clean architecture with single pattern
