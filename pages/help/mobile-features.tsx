import HelpLayout from '../../components/HelpLayout'

export default function MobileFeaturesHelp() {
  return (
    <HelpLayout title="Mobile Features">
      <div className="prose max-w-none">
        <h1>📱 Using TheoShift on Mobile</h1>
        
        <p className="lead">
          TheoShift is optimized for mobile devices! Access all features on your phone or tablet with a touch-friendly interface.
        </p>

        <hr />

        <h2>📲 TheoShift phone app</h2>
        <p>
          If you have the TheoShift app on an iPhone or Android phone, sign in with the same email link as the website.
          Assignments and chat are on their own tabs. <strong>More</strong> has availability, documents, and your email and phone.
          Early check-in is there when you are on the event roster and the event uses early entry.
        </p>
        <p>
          The app is not in the App Store or Google Play yet. Use the website until someone gives you the app.
        </p>

        <h2>📱 Mobile Volunteer Dashboard</h2>
        
        <p>
          Volunteers can access a beautiful, touch-optimized dashboard designed specifically for mobile devices. 
          Login at <code>/volunteer/login</code> to access your personalized dashboard.
        </p>

        <h3>Dashboard Features</h3>
        <p>The mobile volunteer dashboard includes these tabs:</p>
        <ul>
          <li><strong>📋 Assignments:</strong> View all your position assignments for the event</li>
          <li><strong>📅 Availability:</strong> Respond to availability requests from overseers</li>
          <li><strong>👥 Contacts:</strong> Quick access to oversight contacts with one-tap call/email</li>
          <li><strong>📄 Documents:</strong> View all published event documents</li>
          <li>
            <strong>➕ Request:</strong> When the event uses IVS, submit a new IVS volunteer for staff
            approval (email and phone required)
          </li>
        </ul>

        <h3>Header Actions</h3>
        <ul>
          <li><strong>Refresh Button:</strong> Reload the latest data (circular arrow icon)</li>
          <li><strong>Sign Out Button:</strong> Logout from your account (logout icon)</li>
        </ul>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
          <p className="font-semibold text-blue-800">💡 Tip</p>
          <p className="text-blue-700 mb-0">
            All buttons and touch targets are at least 44px tall for easy tapping on mobile devices.
          </p>
        </div>

        <h3>Documents Tab</h3>
        <p>
          View all documents published to you by event overseers:
        </p>
        <ul>
          <li>See document title, description, and publication date</li>
          <li>View file size and type (PDF, images, videos)</li>
          <li>Tap any document to open it in a full-screen in-app viewer (no browser tab switching)</li>
          <li>Document count badge shows number of available documents</li>
        </ul>

        <hr />

        <h2>🧭 Mobile Navigation</h2>
        
        <h3>Volunteer Bottom Navigation Bar</h3>
        <p>
          When you're logged in as a volunteer, a navigation bar appears at the bottom of every screen for quick access to your key pages:
        </p>
        <ul>
          <li><strong>Dashboard:</strong> Your assignments and event information</li>
          <li><strong>Check-In:</strong> Early check-in for your event (available when you are on the event roster and IVS is enabled)</li>
          <li><strong>Events:</strong> Browse and select events</li>
        </ul>
        <p>
          The active page is highlighted in blue so you always know where you are. Tap any icon to switch instantly.
          If <strong>Check-In</strong> looks greyed out, select an event first, or confirm you are on that event&apos;s Volunteers roster.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
          <p className="font-semibold text-blue-800">💡 Tip</p>
          <p className="text-blue-700 mb-0">
            The bottom navigation stays fixed as you scroll, so you can jump between sections without scrolling back to the top. It also respects the iPhone home indicator safe area so nothing gets cut off.
          </p>
        </div>

        <h3>Admin Bottom Navigation Bar</h3>
        <p>
          Admins and overseers also have a bottom navigation bar when managing events on mobile, with quick access to event sections.
        </p>

        <h3>Event sections (Overview, Positions, Volunteers, …)</h3>
        <p>
          On a narrow screen, the row of event tabs is replaced by the current <strong>Section</strong> name and a <strong>More</strong> button.
          Tap <strong>More</strong> to open a list of every section (Overview, Positions, Volunteers, IVS Module, and so on) and jump without swiping sideways.
          Event <strong>Settings</strong> uses the same pattern for its own sub-sections.
        </p>

        <h3>Hamburger Menu</h3>
        <p>
          Tap the menu icon (☰) in the top-left corner to access:
        </p>
        <ul>
          <li>Event selection</li>
          <li>Admin portal (if you're an admin)</li>
          <li>Help center</li>
          <li>Account settings</li>
        </ul>

        <hr />

        <h2>📊 Mobile Tables</h2>
        
        <h3>Card View</h3>
        <p>
          On mobile devices, tables automatically convert to easy-to-read cards. Each card shows:
        </p>
        <ul>
          <li>All important information clearly labeled</li>
          <li>Action buttons at the bottom</li>
          <li>Color-coded status indicators</li>
        </ul>

        <h3>Horizontal Scrolling</h3>
        <p>
          For complex tables that need all columns visible, swipe left or right to see more information. 
          A shadow indicator shows when there's more content to scroll.
        </p>

        <h3>Selecting several volunteers at once</h3>
        <p>
          On the <strong>Volunteers</strong> list and <strong>IVS Approvals</strong>, click one checkbox, then hold <strong>Shift</strong> and click another checkbox to select everyone in between on the <strong>current page</strong>.
          This works on both card view and the full table.
        </p>

        <h3>Staying in place after you refresh</h3>
        <p>
          When you use your browser&apos;s refresh, TheoShift remembers your scroll position on long lists (including Volunteers and IVS) so you land back where you were reading.
        </p>

        <hr />

        <h2>👆 Touch Gestures</h2>
        
        <h3>Pull to Refresh</h3>
        <p>
          On any page, pull down from the top to refresh the content. You'll see:
        </p>
        <ol>
          <li>A loading indicator appears as you pull</li>
          <li>Release when ready to refresh</li>
          <li>Page content updates automatically</li>
        </ol>

        <h3>Swipe Actions</h3>
        <p>
          Some items support swipe gestures for quick actions:
        </p>
        <ul>
          <li><strong>Swipe left:</strong> Reveal delete or edit options</li>
          <li><strong>Swipe right:</strong> Mark as complete or approve</li>
        </ul>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
          <p className="font-semibold text-yellow-800">⚠️ Note</p>
          <p className="text-yellow-700 mb-0">
            Swipe gestures are available on specific lists and will show visual feedback when active.
          </p>
        </div>

        <hr />

        <h2>📝 Mobile Forms</h2>
        
        <h3>Touch-Friendly Inputs</h3>
        <p>
          All form fields are optimized for mobile:
        </p>
        <ul>
          <li><strong>Large tap targets:</strong> Buttons and inputs are sized for easy tapping</li>
          <li><strong>Smart keyboards:</strong> Email fields show email keyboard, phone fields show number pad</li>
          <li><strong>Autocomplete:</strong> Your device can suggest saved information</li>
          <li><strong>No zoom:</strong> Text is sized to prevent accidental zooming</li>
        </ul>

        <h3>Dropdown Menus</h3>
        <p>
          Dropdown menus are enhanced for touch:
        </p>
        <ul>
          <li>Larger options for easier selection</li>
          <li>Custom styling that works with your device</li>
          <li>Clear visual feedback when tapped</li>
        </ul>

        <hr />

        <h2>💬 Modals and Dialogs</h2>
        
        <h3>Full-Screen on Mobile</h3>
        <p>
          Pop-up windows (modals) appear full-screen on mobile devices for easier interaction:
        </p>
        <ul>
          <li>Slide up from the bottom with smooth animation</li>
          <li>Large close button in the top corner</li>
          <li>Action buttons stack vertically for easy tapping</li>
          <li>Scroll within the modal if content is long</li>
        </ul>

        <hr />

        <h2>📈 Dashboard on Mobile</h2>
        
        <h3>Optimized Layout</h3>
        <p>
          The event dashboard adapts to your screen:
        </p>
        <ul>
          <li><strong>Stacked cards:</strong> Information cards stack vertically for easy scrolling</li>
          <li><strong>Compact stats:</strong> Statistics show in a 2-column grid</li>
          <li><strong>Full-width buttons:</strong> Action buttons span the full width for easy tapping</li>
          <li><strong>Simplified charts:</strong> Charts are sized appropriately for mobile screens</li>
        </ul>

        <hr />

        <h2>🔌 Offline Support</h2>
        
        <h3>Progressive Web App (PWA)</h3>
        <p>
          TheoShift works even when you lose internet connection:
        </p>
        <ul>
          <li>Recently viewed pages load from cache</li>
          <li>Basic navigation works offline</li>
          <li>You'll see a notification when offline</li>
          <li>Changes sync automatically when back online</li>
        </ul>

        <h3>Install as App</h3>
        <p>
          You can install TheoShift on your phone like a native app:
        </p>
        <ol>
          <li>Open TheoShift in your mobile browser</li>
          <li>Tap the "Add to Home Screen" option in your browser menu</li>
          <li>Confirm installation</li>
          <li>Launch from your home screen like any other app</li>
        </ol>

        <div className="bg-green-50 border-l-4 border-green-400 p-4 my-4">
          <p className="font-semibold text-green-800">✨ Benefits of Installing</p>
          <ul className="text-green-700 mb-0">
            <li>Faster loading times</li>
            <li>Works offline</li>
            <li>Full-screen experience (no browser bars)</li>
            <li>Easy access from home screen</li>
          </ul>
        </div>

        <hr />

        <h2>❓ Common Questions</h2>
        
        <h3>Why does the layout look different on my phone?</h3>
        <p>
          TheoShift automatically adapts to your screen size. Mobile devices see a simplified, 
          touch-friendly layout while desktop users see more information at once.
        </p>

        <h3>Can I do everything on mobile that I can on desktop?</h3>
        <p>
          Yes! All features are available on mobile. Some complex tasks (like bulk editing) 
          may be easier on a larger screen, but everything is fully functional.
        </p>

        <h3>Do I need to download an app?</h3>
        <p>
          No download required! TheoShift works in your mobile browser. However, you can 
          optionally install it as a Progressive Web App for a better experience.
        </p>

        <h3>Why do some tables scroll horizontally?</h3>
        <p>
          Some tables have many columns that can't fit on a small screen. You can swipe left/right 
          to see all columns, or the table will convert to cards for easier viewing.
        </p>

        <hr />

        <h2>💡 Mobile Tips</h2>
        
        <ul>
          <li><strong>Use landscape mode</strong> for tables with many columns</li>
          <li><strong>Pull to refresh</strong> to see the latest updates</li>
          <li><strong>Install as PWA</strong> for the best mobile experience</li>
          <li><strong>Use the bottom nav</strong> for quick navigation within events</li>
          <li><strong>Tap and hold</strong> on some items for additional options</li>
        </ul>

        <hr />

        <h2>📞 Need More Help?</h2>
        
        <p>
          If you're having trouble with mobile features:
        </p>
        <ul>
          <li>Check the <a href="/help/troubleshooting" className="text-blue-600 hover:underline">Troubleshooting Guide</a></li>
          <li>Contact your system administrator</li>
          <li>Use the <strong>Send Feedback</strong> button to report issues</li>
        </ul>
      </div>
    </HelpLayout>
  )
}
