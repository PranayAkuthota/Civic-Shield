import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { User, Complaint } from '../models';

export interface NotificationData {
  userId: string;
  type: 'email' | 'sms' | 'push' | 'inapp' | 'all';
  subject: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high';
}

export interface EmailTemplate {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface SMSTemplate {
  to: string;
  message: string;
}

export interface PushNotificationTemplate {
  to: string;
  title: string;
  body: string;
  data?: any;
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter(): void {
    try {
      const sendgridApiKey = process.env.SENDGRID_API_KEY;
      const fromEmail = process.env.FROM_EMAIL || 'noreply@telangana.gov.in';

      if (sendgridApiKey) {
        // Use SendGrid
        this.emailTransporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: sendgridApiKey
          }
        });
      } else {
        // Fallback to Gmail or other SMTP
        this.emailTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
      }

      logger.info('Email transporter initialized');
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      this.emailTransporter = null;
    }
  }

  // Send email notification
  async sendEmail(email: EmailTemplate): Promise<boolean> {
    try {
      if (!this.emailTransporter) {
        logger.warn('Email transporter not available');
        return false;
      }

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@telangana.gov.in',
        to: email.to,
        subject: email.subject,
        html: email.htmlBody,
        text: email.textBody || this.stripHtml(email.htmlBody)
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email sent to ${email.to}: ${result.messageId}`);

      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  // Send SMS notification (mock implementation)
  async sendSMS(sms: SMSTemplate): Promise<boolean> {
    try {
      // In production, this would integrate with SMS gateway providers like:
      // - Twilio
      // - AWS SNS
      // - MessageBird
      // - Local Indian SMS gateways

      logger.info(`SMS sent to ${sms.to}: ${sms.message.substring(0, 50)}...`);
      return true;
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      return false;
    }
  }

  // Send push notification (mock implementation)
  async sendPushNotification(push: PushNotificationTemplate): Promise<boolean> {
    try {
      // In production, this would integrate with:
      // - Firebase Cloud Messaging (FCM)
      // - Apple Push Notification Service (APNS)
      // - Web Push API

      logger.info(`Push notification sent to ${push.to}: ${push.title}`);
      return true;
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      return false;
    }
  }

  // Send in-app notification (would be stored in database)
  async sendInAppNotification(userId: string, title: string, message: string, data?: any): Promise<boolean> {
    try {
      // In production, this would store notifications in a database collection
      // and would be retrieved when user logs in or via WebSocket

      logger.info(`In-app notification for user ${userId}: ${title}`);
      return true;
    } catch (error) {
      logger.error('Failed to send in-app notification:', error);
      return false;
    }
  }

  // Send notification using appropriate channel(s)
  async sendNotification(notification: NotificationData): Promise<boolean> {
    try {
      const user = await User.findById(notification.userId);
      if (!user) {
        logger.warn(`User not found: ${notification.userId}`);
        return false;
      }

      let success = true;

      // Send email notification
      if (notification.type === 'email' || notification.type === 'all') {
        const emailTemplate = this.generateEmailTemplate(user, notification);
        const emailSent = await this.sendEmail(emailTemplate);
        success = success && emailSent;
      }

      // Send SMS notification
      if (notification.type === 'sms' || notification.type === 'all') {
        const smsTemplate = this.generateSMSTemplate(user, notification);
        const smsSent = await this.sendSMS(smsTemplate);
        success = success && smsSent;
      }

      // Send push notification
      if (notification.type === 'push' || notification.type === 'all') {
        const pushTemplate = this.generatePushTemplate(notification);
        const pushSent = await this.sendPushNotification(pushTemplate);
        success = success && pushSent;
      }

      // Send in-app notification
      if (notification.type === 'inapp' || notification.type === 'all') {
        const inappSent = await this.sendInAppNotification(
          user._id.toString(),
          notification.subject,
          notification.message,
          notification.data
        );
        success = success && inappSent;
      }

      return success;
    } catch (error) {
      logger.error('Failed to send notification:', error);
      return false;
    }
  }

  // Send notifications to multiple users
  async sendBulkNotifications(userIds: string[], notification: Omit<NotificationData, 'userId'>): Promise<number> {
    let successCount = 0;

    for (const userId of userIds) {
      const result = await this.sendNotification({
        ...notification,
        userId
      });
      if (result) successCount++;
    }

    logger.info(`Bulk notifications sent: ${successCount}/${userIds.length} successful`);
    return successCount;
  }

  // Send complaint status update notification
  async sendComplaintStatusNotification(complaintId: string, newStatus: string, comment: string): Promise<void> {
    try {
      const complaint = await Complaint.findById(complaintId)
        .populate('filedBy', 'name email phone')
        .populate('assignedTo', 'name email');

      if (!complaint) {
        logger.warn(`Complaint not found: ${complaintId}`);
        return;
      }

      const statusMessages: Record<string, string> = {
        filed: 'Your complaint has been filed successfully',
        under_review: 'Your complaint is under review',
        investigation: 'Investigation has started on your complaint',
        resolved: 'Your complaint has been resolved',
        rejected: 'Your complaint has been rejected',
        closed: 'Your complaint has been closed',
        reopened: 'Your complaint has been reopened'
      };

      const baseMessage = statusMessages[newStatus] || `Your complaint status has been updated to: ${newStatus}`;

      // Notify the complainant
      if (complaint.filedBy && !complaint.isAnonymous) {
        const complainant = complaint.filedBy as any;
        await this.sendNotification({
          userId: complainant._id.toString(),
          type: 'email',
          subject: `Complaint Status Update - ${complaint.complaintId}`,
          message: `${baseMessage}\n\nComplaint ID: ${complaint.complaintId}\nTitle: ${complaint.title}\n\nComment: ${comment}`,
          data: {
            complaintId: complaint._id.toString(),
            complaintNumber: complaint.complaintId,
            newStatus,
            comment
          },
          priority: newStatus === 'resolved' ? 'high' : 'medium'
        });
      }

      // Notify assigned officials (if status changed by admin)
      if (complaint.assignedTo && newStatus !== 'filed') {
        const official = complaint.assignedTo as any;
        await this.sendNotification({
          userId: official._id.toString(),
          type: 'email',
          subject: `Complaint Assigned - ${complaint.complaintId}`,
          message: `A new complaint has been assigned to you:\n\nComplaint ID: ${complaint.complaintId}\nTitle: ${complaint.title}\nStatus: ${newStatus}\n\nPlease take appropriate action.`,
          data: {
            complaintId: complaint._id.toString(),
            complaintNumber: complaint.complaintId,
            title: complaint.title
          },
          priority: 'high'
        });
      }
    } catch (error) {
      logger.error('Failed to send complaint status notification:', error);
    }
  }

  // Send welcome email to new users
  async sendWelcomeNotification(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`User not found for welcome notification: ${userId}`);
        return;
      }

      await this.sendNotification({
        userId: user._id.toString(),
        type: 'email',
        subject: 'Welcome to Telangana Properties Protection Portal',
        message: `Dear ${user.name},\n\nWelcome to the Telangana Assets and Properties Protection Portal! Your account has been successfully created.\n\nYou can now:\n- File complaints about property encroachments\n- Track the status of your complaints\n- Provide feedback on resolved cases\n\nThank you for helping protect Telangana's assets.\n\nBest regards,\nTelangana Properties Protection Team`,
        data: {
          userName: user.name,
          userEmail: user.email
        },
        priority: 'medium'
      });
    } catch (error) {
      logger.error('Failed to send welcome notification:', error);
    }
  }

  // Generate email template based on notification data
  private generateEmailTemplate(user: any, notification: NotificationData): EmailTemplate {
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .btn { display: inline-block; padding: 10px 20px; background: #1e3a8a; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Telangana Properties Protection Portal</h1>
          </div>
          <div class="content">
            <h2>${notification.subject}</h2>
            <p>Dear ${user.name},</p>
            <p>${notification.message.replace(/\n/g, '<br>')}</p>
            <p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="btn">
                Visit Portal
              </a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message from the Telangana Properties Protection Portal.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      to: user.email,
      subject: notification.subject,
      htmlBody,
      textBody: `Dear ${user.name},\n\n${notification.message}\n\nVisit Portal: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
    };
  }

  // Generate SMS template based on notification data
  private generateSMSTemplate(user: any, notification: NotificationData): SMSTemplate {
    const message = `[Telangana Properties] ${notification.subject}. ${notification.message}`;
    return {
      to: user.phone,
      message: message.length > 160 ? message.substring(0, 157) + '...' : message
    };
  }

  // Generate push notification template
  private generatePushTemplate(notification: NotificationData): PushNotificationTemplate {
    return {
      to: notification.userId,
      title: notification.subject,
      body: notification.message.length > 100 ? notification.message.substring(0, 97) + '...' : notification.message,
      data: notification.data
    };
  }

  // Strip HTML tags for text version
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  }

  // Test email service
  async testEmailService(testEmail: string): Promise<boolean> {
    try {
      const testTemplate: EmailTemplate = {
        to: testEmail,
        subject: 'Test Email - Telangana Properties Protection Portal',
        htmlBody: `
          <h2>Test Email</h2>
          <p>This is a test email from the Telangana Properties Protection Portal.</p>
          <p>If you received this email, the email service is working correctly.</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        `
      };

      return await this.sendEmail(testTemplate);
    } catch (error) {
      logger.error('Email service test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();