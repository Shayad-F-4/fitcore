import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isDevFallback?: boolean;
}

// Check if transactional SMTP provider credentials are configured
export const isEmailConfigured = (): boolean => {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

// Create Nodemailer transport based on environment variables
// Create Nodemailer transport based on environment variables
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS;
  const pass = rawPass ? rawPass.replace(/\s+/g, '') : '';
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!user || !pass) {
    return null;
  }

  // Automatic Gmail configuration if Gmail address or smtp.gmail.com is specified
  if (host === 'smtp.gmail.com' || (!host && user.toLowerCase().endsWith('@gmail.com'))) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  return nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Sends a password reset email with a cryptographically secure 6-digit OTP or token
 */
export const sendPasswordResetEmail = async (
  toEmail: string,
  resetToken: string,
  userName = 'Staff Member'
): Promise<EmailResult> => {
  const frontendUrl = process.env.CLIENT_URL || ENV.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/login?token=${resetToken}&email=${encodeURIComponent(toEmail)}`;
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || '"Sagar Fitness Gym" <security@sagarfitness.com>';

  const transporter = createTransporter();

  // Branded HTML email template with prominent OTP code
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP - Sagar Fitness Gym</title>
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F5F7FA; color: #1E293B; }
        .wrapper { width: 100%; max-width: 580px; margin: 30px auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
        .header { background: #0F172A; padding: 28px 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; }
        .header p { margin: 4px 0 0; font-size: 12px; color: #94A3B8; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; }
        .content { padding: 32px; }
        .content h2 { margin: 0 0 16px; font-size: 18px; color: #0F172A; }
        .content p { margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #475569; }
        .otp-container { text-align: center; margin: 24px 0; background: #F0FDF4; border: 2px dashed #86EFAC; border-radius: 12px; padding: 20px; }
        .otp-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #166534; margin: 0 0 8px 0; }
        .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #15803D; font-family: 'Courier New', monospace; margin: 0; }
        .button-wrap { text-align: center; margin: 24px 0 12px; }
        .btn { display: inline-block; background: #2563EB; color: #FFFFFF !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 10px; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25); }
        .footer { padding: 24px 32px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>Sagar Fitness Gym</h1>
          <p>Gym Management System</p>
        </div>
        <div class="content">
          <h2>Password Reset Verification Code</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>We received a request to reset your password for your staff account at <strong>Sagar Fitness Gym</strong>. Use the 6-digit OTP verification code below to set a new password:</p>
          
          <div class="otp-container">
            <p class="otp-label">Your 6-Digit Password Reset OTP</p>
            <p class="otp-code">${resetToken}</p>
          </div>

          <p style="text-align: center; font-size: 13px; color: #64748B;">Enter this OTP directly on the password reset screen.</p>

          <div class="button-wrap">
            <a href="${resetUrl}" class="btn" target="_blank">Reset Password Directly</a>
          </div>

          <p><strong>Security Notice:</strong> This OTP is single-use and will expire in <strong>15 minutes</strong>. If you did not request this password reset, please ignore this email; your account remains secure.</p>
        </div>
        <div class="footer">
          <p>Sagar Fitness Gym • Pathardi, Maharashtra, India</p>
          <p>This is an automated administrative notification. Please do not reply directly.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    // If SMTP is not yet configured by the operator
    console.warn(`[Email Service Warning] SMTP is not configured. Reset OTP for ${toEmail}: ${resetToken}`);
    return {
      success: true,
      isDevFallback: true,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[OTP: ${resetToken}] Sagar Fitness Gym Password Reset Verification`,
      text: `Hello ${userName},\n\nWe received a request to reset your password for Sagar Fitness Gym.\n\nYour 6-Digit Password Reset OTP is: ${resetToken}\n\nPlease reset your password using the following link:\n${resetUrl}\n\nThis OTP will expire in 15 minutes.\n\nSagar Fitness Gym • Pathardi, Maharashtra, India`,
      html: htmlContent,
    });

    console.log(`[Email Service] Password reset OTP email dispatched to ${toEmail}. Message ID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[Email Delivery Error]', error);
    return {
      success: false,
      error: error.message || 'Failed to dispatch email via SMTP server.',
    };
  }
};

/**
 * Sends a welcome email to newly provisioned staff members
 */
export const sendStaffWelcomeEmail = async (
  toEmail: string,
  userName: string,
  role: string,
  temporaryPassword?: string
): Promise<EmailResult> => {
  const frontendUrl = process.env.CLIENT_URL || ENV.CLIENT_URL || 'http://localhost:5173';
  const fromAddress = process.env.EMAIL_FROM || '"Sagar Fitness Gym" <admin@sagarfitness.com>';
  const transporter = createTransporter();

  const roleTitle = role === 'RECEPTIONIST' ? 'Front Desk Staff' : role === 'GYM_ADMIN' ? 'Gym Manager' : role;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Welcome to Sagar Fitness Gym</title>
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F5F7FA; color: #1E293B; }
        .wrapper { width: 100%; max-width: 580px; margin: 30px auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; }
        .header { background: #0F172A; padding: 28px 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; }
        .content { padding: 32px; }
        .content h2 { margin: 0 0 16px; font-size: 18px; color: #0F172A; }
        .credential-box { background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; }
        .button-wrap { text-align: center; margin: 24px 0; }
        .btn { display: inline-block; background: #2563EB; color: #FFFFFF !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 10px; }
        .footer { padding: 20px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>Sagar Fitness Gym</h1>
        </div>
        <div class="content">
          <h2>Welcome to the Team, ${userName}!</h2>
          <p>An authorized administrator has provisioned your staff account for the Sagar Fitness Gym Management System.</p>
          <div class="credential-box">
            <p style="margin: 0 0 8px;"><strong>Assigned Role:</strong> ${roleTitle}</p>
            <p style="margin: 0 0 8px;"><strong>Login Email:</strong> ${toEmail}</p>
            ${temporaryPassword ? `<p style="margin: 0;"><strong>Initial Password:</strong> <code style="background: #E2E8F0; padding: 2px 6px; border-radius: 4px;">${temporaryPassword}</code></p>` : ''}
          </div>
          <p>Please log in and update your password immediately from your profile settings.</p>
          <div class="button-wrap">
            <a href="${frontendUrl}/login" class="btn" target="_blank">Sign In to Staff Portal</a>
          </div>
        </div>
        <div class="footer">
          <p>Sagar Fitness Gym • Pathardi, Maharashtra, India</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log(`[Email Service] Staff Welcome Email (Simulated): ${toEmail} as ${roleTitle}`);
    return { success: true, isDevFallback: true };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: 'Welcome to Sagar Fitness Gym Staff Portal',
      html: htmlContent,
    });
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[Email Delivery Error]', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a security notice confirming password has been changed
 */
export const sendPasswordChangedConfirmation = async (
  toEmail: string,
  userName = 'Staff Member'
): Promise<EmailResult> => {
  const fromAddress = process.env.EMAIL_FROM || '"Sagar Fitness Gym" <security@sagarfitness.com>';
  const transporter = createTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Security Alert: Password Changed</title>
      <style>
        body { font-family: sans-serif; background: #F5F7FA; color: #1E293B; margin: 0; padding: 20px; }
        .card { max-width: 500px; margin: 20px auto; background: white; border-radius: 12px; border: 1px solid #E2E8F0; padding: 24px; }
        h2 { color: #0F172A; margin-top: 0; }
        .alert { background: #FEF3C7; border: 1px solid #FCD34D; color: #92400E; padding: 12px; border-radius: 8px; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Password Changed Successfully</h2>
        <p>Hello ${userName},</p>
        <p>Your password for Sagar Fitness Gym Management System was successfully changed on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.</p>
        <div class="alert">
          If you did not perform this action, please contact your gym super-administrator immediately to secure your account.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    return { success: true, isDevFallback: true };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: 'Security Alert: Password Changed - Sagar Fitness Gym',
      html: htmlContent,
    });
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[Email Delivery Error]', error);
    return { success: false, error: error.message };
  }
};
