import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface InvitationEmailData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  tempPassword: string;
  loginUrl: string;
}

// Get email configuration from environment variables
function getEmailConfig(): EmailConfig | null {
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpUser || !smtpPassword) {
    console.warn('Email configuration not found. SMTP_USER and SMTP_PASSWORD required.');
    return null;
  }

  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: smtpUser,
      pass: smtpPassword
    }
  };
}

// Create email transporter
export function createEmailTransporter() {
  const config = getEmailConfig();
  if (!config) {
    throw new Error('Email configuration not available');
  }

  return nodemailer.createTransporter(config);
}

// Send email utility
export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = createEmailTransporter();
  
  const fromName = process.env.EMAIL_FROM_NAME || 'JW Attendant Scheduler';
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const mailOptions = {
    from: `${fromName} <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text
  };

  await transporter.sendMail(mailOptions);
}

// Generate invitation email HTML template
export function generateInvitationEmail(data: InvitationEmailData): string {
  const roleDisplayName = data.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to JW Attendant Scheduler</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background-color: #dc2626; color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🛡️ JW Attendant Scheduler</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Welcome to the Team!</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 30px 20px;">
          <h2 style="color: #374151; margin: 0 0 20px 0;">Hello ${data.firstName}!</h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin: 0 0 20px 0;">
            You have been invited to join the JW Attendant Scheduler system. Your account has been created with the following details:
          </p>

          <!-- Account Details -->
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0;">Account Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Name:</td>
                <td style="padding: 8px 0; color: #374151;">${data.firstName} ${data.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Email:</td>
                <td style="padding: 8px 0; color: #374151;">${data.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Role:</td>
                <td style="padding: 8px 0; color: #374151;">${roleDisplayName}</td>
              </tr>
            </table>
          </div>

          <!-- Login Credentials -->
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 15px 0;">🔑 Login Credentials</h3>
            <p style="color: #92400e; margin: 0 0 10px 0; font-weight: 500;">Temporary Password:</p>
            <div style="background-color: #ffffff; border: 1px solid #d97706; border-radius: 4px; padding: 12px; font-family: monospace; font-size: 16px; font-weight: bold; color: #92400e; letter-spacing: 1px;">
              ${data.tempPassword}
            </div>
            <p style="color: #92400e; margin: 15px 0 0 0; font-size: 14px;">
              ⚠️ <strong>Important:</strong> You will be required to change this password on your first login for security purposes.
            </p>
          </div>

          <!-- Getting Started -->
          <div style="margin: 30px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0;">Getting Started</h3>
            <ol style="color: #6b7280; line-height: 1.6; padding-left: 20px;">
              <li style="margin: 8px 0;">Click the login button below to access the system</li>
              <li style="margin: 8px 0;">Use your email address and the temporary password provided</li>
              <li style="margin: 8px 0;">Create a new secure password when prompted</li>
              <li style="margin: 8px 0;">Complete your profile setup</li>
            </ol>
          </div>

          <!-- Login Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginUrl}" style="display: inline-block; background-color: #dc2626; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              🚀 Login to Your Account
            </a>
          </div>

          <!-- Role Information -->
          <div style="background-color: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0;">👥 Your Role: ${roleDisplayName}</h3>
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              ${getRoleDescription(data.role)}
            </p>
          </div>

          <!-- Support -->
          <div style="margin: 30px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0;">Need Help?</h3>
            <p style="color: #6b7280; line-height: 1.6; margin: 0;">
              If you have any questions or need assistance getting started, please contact your system administrator or overseer.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #374151; color: #d1d5db; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            JW Attendant Scheduler - Organizing Kingdom Hall Events
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">
            This email was sent automatically. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Get role description for email template
function getRoleDescription(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'You have full administrative access to manage users, events, and system settings.';
    case 'OVERSEER':
      return 'You can manage events, assign attendants, and oversee Kingdom Hall operations.';
    case 'ASSISTANT_OVERSEER':
      return 'You can assist with event management and attendant coordination.';
    case 'KEYMAN':
      return 'You are responsible for facility access, setup, and key management.';
    case 'ATTENDANT':
      return 'You can view your assignments and participate in assigned Kingdom Hall events.';
    default:
      return 'You have been granted access to the JW Attendant Scheduler system.';
  }
}

// Send invitation email
export async function sendInvitationEmail(data: InvitationEmailData): Promise<void> {
  const html = generateInvitationEmail(data);
  
  const subject = `Welcome to JW Attendant Scheduler - Your Account is Ready!`;
  
  const text = `
Welcome to JW Attendant Scheduler!

Hello ${data.firstName},

You have been invited to join the JW Attendant Scheduler system.

Account Details:
- Name: ${data.firstName} ${data.lastName}
- Email: ${data.email}
- Role: ${data.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

Login Credentials:
- Temporary Password: ${data.tempPassword}
- Login URL: ${data.loginUrl}

IMPORTANT: You will be required to change this password on your first login.

Getting Started:
1. Visit the login URL above
2. Use your email and temporary password
3. Create a new secure password when prompted
4. Complete your profile setup

If you need assistance, please contact your system administrator.

JW Attendant Scheduler
  `;

  await sendEmail({
    to: data.email,
    subject,
    html,
    text
  });
}

// Check if email is configured
export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}
