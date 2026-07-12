import nodemailer from 'nodemailer';
import { env } from '../config/env';

export const mailer = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: false,
  auth:
    env.smtp.user && env.smtp.password
      ? {
          user: env.smtp.user,
          pass: env.smtp.password
        }
      : undefined
});