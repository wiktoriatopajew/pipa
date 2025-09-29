import nodemailer from 'nodemailer';

const NOTIFICATION_EMAIL = 'wiktoriatopajew@gmail.com';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify transporter configuration on startup
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter.verify((error: Error | null, success: boolean) => {
    if (error) {
      console.log('Email configuration error:', error);
    } else {
      console.log('Email server ready to send messages');
    }
  });
} else {
  console.log('Email notifications disabled: SMTP credentials not configured');
}

export async function sendUserLoginNotification(username: string, email: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Skipping email: SMTP not configured');
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: NOTIFICATION_EMAIL,
      subject: `✅ New User Login - ${username}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4F46E5;">New User Login</h2>
          <p>A user has logged into ChatWithMechanic.com:</p>
          <ul>
            <li><strong>Username:</strong> ${username}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        </div>
      `,
    });
    console.log('Login notification sent');
  } catch (error) {
    console.error('Failed to send login notification:', error);
  }
}

export async function sendFirstMessageNotification(
  username: string,
  email: string,
  message: string,
  sessionId: string
) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Skipping email: SMTP not configured');
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: NOTIFICATION_EMAIL,
      subject: `💬 First Chat Message - ${username}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4F46E5;">User Started First Chat</h2>
          <p><strong>${username}</strong> (${email}) has sent their first message:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 0;">${message}</p>
          </div>
          <p><strong>Session ID:</strong> ${sessionId}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
    });
    console.log('First message notification sent');
  } catch (error) {
    console.error('Failed to send first message notification:', error);
  }
}

export async function sendSubsequentMessageNotification(
  username: string,
  email: string,
  message: string,
  sessionId: string,
  messageCount: number
) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Skipping email: SMTP not configured');
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: NOTIFICATION_EMAIL,
      subject: `💬 New Message #${messageCount} - ${username}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4F46E5;">New Message from User</h2>
          <p><strong>${username}</strong> (${email}) sent message #${messageCount}:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 0;">${message}</p>
          </div>
          <p><strong>Session ID:</strong> ${sessionId}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
    });
    console.log('Subsequent message notification sent');
  } catch (error) {
    console.error('Failed to send subsequent message notification:', error);
  }
}
