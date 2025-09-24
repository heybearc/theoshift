'use client'

import { SessionProvider } from '@/lib/auth-stub'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{
          __html: `
      /* Modern Professional Admin Panel Styling */
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        color: #1a202c;
      }
      
      /* Navigation */
      .nav-header {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        padding: 1rem 2rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }
      
      .nav-container {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .nav-brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .nav-logo {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 18px;
      }
      
      .nav-title {
        font-size: 24px;
        font-weight: 700;
        background: linear-gradient(135deg, #667eea, #764ba2);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .nav-user {
        display: flex;
        align-items: center;
        gap: 16px;
        background: rgba(102, 126, 234, 0.1);
        padding: 8px 16px;
        border-radius: 12px;
        border: 1px solid rgba(102, 126, 234, 0.2);
      }
      
      .user-avatar {
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 14px;
      }
      
      .user-info h4 {
        font-size: 14px;
        font-weight: 600;
        color: #2d3748;
      }
      
      .user-info p {
        font-size: 12px;
        color: #718096;
      }
      
      /* Main Content */
      .main-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;
      }
      
      .page-header {
        margin-bottom: 2rem;
      }
      
      .page-title {
        font-size: 32px;
        font-weight: 800;
        color: white;
        margin-bottom: 8px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .page-subtitle {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 400;
      }
      
      /* Stats Grid */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 24px;
        margin-bottom: 3rem;
      }
      
      .stat-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 24px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .stat-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      }
      
      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        font-size: 20px;
        color: white;
      }
      
      .stat-icon.users { background: linear-gradient(135deg, #667eea, #764ba2); }
      .stat-icon.events { background: linear-gradient(135deg, #f093fb, #f5576c); }
      .stat-icon.attendants { background: linear-gradient(135deg, #4facfe, #00f2fe); }
      
      .stat-number {
        font-size: 36px;
        font-weight: 800;
        color: #2d3748;
        margin-bottom: 4px;
      }
      
      .stat-label {
        font-size: 14px;
        color: #718096;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .stat-change {
        font-size: 12px;
        color: #38a169;
        font-weight: 600;
        margin-top: 8px;
      }
      
      /* Admin Modules */
      .modules-section {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 32px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      }
      
      .section-title {
        font-size: 24px;
        font-weight: 700;
        color: #2d3748;
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .modules-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
      }
      
      .module-card {
        background: white;
        border-radius: 12px;
        padding: 24px;
        border: 1px solid #e2e8f0;
        transition: all 0.2s ease;
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }
      
      .module-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        transform: scaleX(0);
        transition: transform 0.2s ease;
      }
      
      .module-card:hover::before {
        transform: scaleX(1);
      }
      
      .module-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        border-color: #667eea;
      }
      
      .module-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        font-size: 18px;
        color: white;
      }
      
      .module-card h4 {
        font-size: 18px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 8px;
      }
      
      .module-card p {
        color: #718096;
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 16px;
      }
      
      .module-link {
        color: #667eea;
        font-weight: 600;
        font-size: 14px;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: color 0.2s ease;
      }
      
      .module-link:hover {
        color: #764ba2;
      }
      
      /* Buttons */
      .btn {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
      }
      
      .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .nav-container {
          flex-direction: column;
          gap: 16px;
        }
        
        .main-container {
          padding: 1rem;
        }
        
        .stats-grid {
          grid-template-columns: 1fr;
        }
        
        .modules-grid {
          grid-template-columns: 1fr;
        }
      }
    `
        }} />
      </head>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}