# Magic Link Authentication

## Overview

TheoShift now supports passwordless authentication via magic links for volunteers. This provides a secure, user-friendly alternative to PIN-based login.

## How It Works

### User Flow

1. **Request Magic Link**
   - Volunteer goes to `/auth/signin`
   - Selects "Volunteer" role
   - Chooses "Email Link" method
   - Enters their registered email address (matching is **case-insensitive** — any normal capitalization of the same address works)
   - Clicks "Send Sign-In Link"

2. **Receive Email**
   - System validates the address against the registered volunteer (case-insensitive)
   - Generates secure one-time token (32 bytes, cryptographically random)
   - Sends beautiful HTML email with magic link
   - Token expires in 24 hours

3. **Click Magic Link**
   - Link format: `/api/auth/magic-link/verify?token=xxx&email=xxx`
   - System verifies token exists and hasn't expired
   - Token is deleted (one-time use)
   - User is redirected to callback endpoint

4. **Authentication**
   - Callback creates JWT session using NextAuth's encode function
   - Sets secure HTTP-only session cookie
   - Redirects to `/volunteer/select-event`
   - User is now authenticated!

## Technical Architecture

### Custom Implementation (Not NextAuth EmailProvider)

We built a custom magic link system because NextAuth's `EmailProvider` requires an adapter, which is incompatible with our existing `CredentialsProvider` setup.

### API Endpoints

#### 1. Send Magic Link: `/api/auth/magic-link/send`
- **Method:** POST
- **Body:** `{ email: string }`
- **Validates:** Email belongs to registered volunteer
- **Creates:** Secure token in `VerificationToken` table
- **Sends:** Email with magic link
- **Returns:** Success message

#### 2. Verify Token: `/api/auth/magic-link/verify`
- **Method:** GET
- **Query:** `token`, `email`
- **Validates:** Token exists, not expired, matches email
- **Deletes:** Token (one-time use)
- **Redirects:** To callback endpoint with session token

#### 3. Create Session: `/api/auth/magic-link/callback`
- **Method:** GET
- **Query:** `session`, `email`
- **Validates:** Volunteer exists
- **Creates:** JWT using NextAuth's `encode` function
- **Sets:** HTTP-only session cookie
- **Redirects:** To `/volunteer/select-event`

### Database Schema

Uses existing `VerificationToken` table:
```prisma
model VerificationToken {
  identifier String   // Email address
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

### Security Features

1. **One-Time Use Tokens**
   - Token deleted after verification
   - Cannot be reused

2. **Time-Limited**
   - 24-hour expiration
   - Expired tokens automatically rejected

3. **Email Validation**
   - Only registered volunteer emails accepted
   - No account creation for unknown emails

4. **Secure Token Generation**
   - 32 bytes of cryptographic randomness
   - 64 character hex string

5. **HTTP-Only Cookies**
   - Session cookie not accessible via JavaScript
   - Protected from XSS attacks

6. **Proper JWT Encoding**
   - Uses NextAuth's `encode` function
   - Compatible with existing session system

## PWA Integration

### Service Worker Behavior

The service worker is configured to **exclude all auth routes** to ensure magic links work properly:

```javascript
// Exclude auth routes from service worker (allow redirects for magic links)
if (url.includes('/api/auth/') || url.includes('/auth/')) {
  return; // Let browser handle auth routes natively
}
```

### Conditional Registration

Service worker only registers for:
- Mobile devices (iOS, Android, etc.)
- PWA standalone mode (installed to home screen)

Desktop browsers do NOT get the service worker, avoiding any potential issues.

## Testing

### Desktop Browser
1. Go to https://theoshift.com/auth/signin
2. Select Volunteer → Email Link
3. Enter registered volunteer email
4. Check email and click link
5. Should be authenticated and redirected to event selection

### Mobile Device
1. Open https://theoshift.com/auth/signin on phone
2. Follow same steps as desktop
3. Service worker will be registered
4. Can install to home screen for PWA experience

### Verify Service Worker Status
- Desktop: Open DevTools → Console → Should see "Service Worker unregistered (desktop browser)"
- Mobile: Open DevTools → Console → Should see "Service Worker registered for mobile/PWA"

## Email Template

The magic link email includes:
- Personalized greeting with volunteer's first name
- Clear call-to-action button
- Security notice (24-hour expiration, one-time use)
- Fallback text link for email clients that don't support buttons
- Professional TheoShift branding

## Backward Compatibility

All existing authentication methods still work:
- ✅ Admin/Overseer email + password login
- ✅ Volunteer magic-link login

## Error Handling

### User-Facing Errors
- `InvalidToken` - Token not found or already used
- `TokenExpired` - Token older than 24 hours
- `VolunteerNotFound` - Email not registered
- `InvalidSession` - Session creation failed
- `CallbackFailed` - General callback error

### Error Redirects
All errors redirect to `/auth/signin?error=ErrorCode` with appropriate message displayed to user.

## Configuration

### Environment Variables Required
- `NEXTAUTH_SECRET` - Used for JWT encoding
- `NEXTAUTH_URL` - Base URL for magic link generation
- Email config in `system_settings` table (key: `email_config`)

### Email Configuration
Uses existing email configuration from database:
- Gmail OAuth or SMTP
- Same config as assignment notification emails
- Configured via admin settings

## Future Enhancements

Potential improvements:
1. **Rate Limiting** - Prevent abuse by limiting magic link requests per email
2. **IP Validation** - Optionally validate token used from same IP that requested it
3. **Device Fingerprinting** - Additional security layer
4. **Push Notifications** - Notify volunteers of new assignments (PWA feature)
5. **Biometric Auth** - Face ID / Touch ID for installed PWA

## Troubleshooting

### Magic Link Not Working
1. Check service worker is not interfering (should be disabled on desktop)
2. Verify token exists in database and hasn't expired
3. Check server logs for errors
4. Ensure `NEXTAUTH_SECRET` is configured

### Service Worker Issues
1. Unregister manually: DevTools → Application → Service Workers → Unregister
2. Clear browser cache
3. Verify mobile detection is working correctly

### Session Not Created
1. Check JWT encoding is using NextAuth's `encode` function
2. Verify cookie is being set with correct name
3. Check session cookie domain matches site domain

## Support

For issues or questions:
1. Check server logs: `pm2 logs theoshift-blue`
2. Review this documentation
3. Test in incognito mode to rule out cache issues
4. Verify volunteer email is registered in database
