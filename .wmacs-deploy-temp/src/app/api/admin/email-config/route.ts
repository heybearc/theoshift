import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import nodemailer from 'nodemailer';

// Validation schemas
const emailConfigSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.number().min(1).max(65535, 'Valid port number required'),
  smtpSecure: z.boolean(),
  smtpUser: z.string().email('Valid email address required'),
  smtpPassword: z.string().min(1, 'SMTP password is required'),
  fromName: z.string().min(1, 'From name is required'),
  fromEmail: z.string().email('Valid from email required')
});

const testEmailSchema = z.object({
  toEmail: z.string().email('Valid email address required'),
  subject: z.string().min(1, 'Subject is required').optional().default('Test Email'),
  message: z.string().min(1, 'Message is required').optional().default('This is a test email from JW Attendant Scheduler.')
});

// Admin middleware check
async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    );
  }

  return null;
}

// GET /api/admin/email-config - Get current email configuration
export async function GET(request: NextRequest) {
  const authError = await checkAdminAuth();
  if (authError) return authError;

  try {
    // Get email configuration from database or environment
    const config = {
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpSecure: process.env.SMTP_SECURE === 'true',
      smtpUser: process.env.SMTP_USER || '',
      smtpPassword: process.env.SMTP_PASSWORD ? '••••••••' : '', // Mask password
      fromName: process.env.EMAIL_FROM_NAME || 'JW Attendant Scheduler',
      fromEmail: process.env.EMAIL_FROM || process.env.SMTP_USER || '',
      isConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD)
    };

    return NextResponse.json({
      success: true,
      data: { config }
    });

  } catch (error) {
    console.error('Error fetching email config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email configuration' },
      { status: 500 }
    );
  }
}

// POST /api/admin/email-config - Update email configuration
export async function POST(request: NextRequest) {
  const authError = await checkAdminAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const validatedData = emailConfigSchema.parse(body);

    // Test the email configuration before saving
    try {
      const transporter = nodemailer.createTransport({
        host: validatedData.smtpHost,
        port: validatedData.smtpPort,
        secure: validatedData.smtpSecure,
        auth: {
          user: validatedData.smtpUser,
          pass: validatedData.smtpPassword
        }
      });

      // Verify the connection
      await transporter.verify();

    } catch (emailError) {
      console.error('Email configuration test failed:', emailError);
      return NextResponse.json(
        { success: false, error: 'Email configuration test failed. Please check your SMTP settings.' },
        { status: 400 }
      );
    }

    // In a real implementation, you would save these to a secure configuration store
    // For now, we'll return success with a note about environment variables
    
    return NextResponse.json({
      success: true,
      message: 'Email configuration validated successfully',
      note: 'To persist these settings, update your environment variables and restart the application.',
      data: {
        config: {
          ...validatedData,
          smtpPassword: '••••••••' // Mask password in response
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating email config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update email configuration' },
      { status: 500 }
    );
  }
}

// POST /api/admin/email-config/test - Test email configuration
export async function PUT(request: NextRequest) {
  const authError = await checkAdminAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const validatedData = testEmailSchema.parse(body);

    // Get current email configuration
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    };

    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
      return NextResponse.json(
        { success: false, error: 'Email configuration not found. Please configure SMTP settings first.' },
        { status: 400 }
      );
    }

    // Create transporter and send test email
    const transporter = nodemailer.createTransport(smtpConfig);

    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'JW Attendant Scheduler'} <${process.env.EMAIL_FROM || smtpConfig.auth.user}>`,
      to: validatedData.toEmail,
      subject: validatedData.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🛡️ JW Attendant Scheduler</h1>
            <p style="margin: 5px 0 0 0;">Email Configuration Test</p>
          </div>
          <div style="padding: 20px; background-color: #f9fafb;">
            <h2 style="color: #374151;">Test Email Successful!</h2>
            <p style="color: #6b7280;">${validatedData.message}</p>
            <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af;"><strong>Configuration Details:</strong></p>
              <ul style="color: #1e40af; margin: 10px 0;">
                <li>SMTP Host: ${smtpConfig.host}</li>
                <li>SMTP Port: ${smtpConfig.port}</li>
                <li>Security: ${smtpConfig.secure ? 'SSL/TLS' : 'STARTTLS'}</li>
                <li>From: ${process.env.EMAIL_FROM_NAME || 'JW Attendant Scheduler'}</li>
              </ul>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              This email was sent at ${new Date().toLocaleString()} to test the email configuration.
            </p>
          </div>
          <div style="background-color: #374151; color: #d1d5db; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">JW Attendant Scheduler Admin Panel</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${validatedData.toEmail}`,
      data: {
        sentAt: new Date().toISOString(),
        recipient: validatedData.toEmail,
        subject: validatedData.subject
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error sending test email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send test email. Please check your email configuration.' },
      { status: 500 }
    );
  }
}
