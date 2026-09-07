import nodemailer from 'nodemailer'

export type SendEmailInput = {
  to: string
  subject: string
  text: string
  html?: string
}

export class EmailService {
  private readonly mailer

  constructor() {
    this.mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    })
  }

  async send(input: SendEmailInput): Promise<void> {
    await this.mailer.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      ...input,
    })
  }
}