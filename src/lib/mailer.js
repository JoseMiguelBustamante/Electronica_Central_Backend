import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let transporter;

const getTransporter = () => {
  if (!env.smtpConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport(env.SMTP_URL);
  }
  return transporter;
};

/**
 * @param {{ to: string, subject: string, text: string, html?: string }} message
 * @returns {Promise<{ sent: boolean, skipped?: boolean, messageId?: string }>}
 */
export const sendMail = async (message) => {
  const transport = getTransporter();
  if (!transport) {
    logger.info('mail_skipped_no_smtp', { to: message.to, subject: message.subject });
    return { sent: false, skipped: true };
  }

  const info = await transport.sendMail({
    from: env.MAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  logger.info('mail_sent', { to: message.to, subject: message.subject, messageId: info.messageId });
  return { sent: true, messageId: info.messageId };
};

/** Test helper — clears cached transporter between tests. */
export const resetMailerForTests = () => {
  transporter = undefined;
};
