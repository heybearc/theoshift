export async function revokeVolunteerBrowserSignIn() {
  try {
    await fetch('/api/volunteer/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke-current' }),
    })
  } catch {
    // NextAuth still clears the cookie.
  }
}
