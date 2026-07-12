import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';
import { User } from '../entities/User';
import { Employee } from '../entities/Employee';
import { authenticateToken } from '../middlewares/auth.middleware';
import { signAuthToken } from '../auth/jwt';
import { mailer } from '../utils/mailer';
import { logAudit } from '../utils/audit';

export const authRouter = Router();

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

authRouter.post('/forgot-password', async (req, res) => {
  const { email } = req.body as { email?: string };

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: { email },
    relations: {
      employee: true
    }
  });

  if (!user || !user.isActive || !user.employee?.isActive) {
    return res.json({ message: 'If the account exists, a reset email has been sent.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const passwordResetToken = hashResetToken(resetToken);
  const passwordResetExpiresAt = new Date(Date.now() + 1000 * 60 * 30);

  user.passwordResetToken = passwordResetToken;
  user.passwordResetExpiresAt = passwordResetExpiresAt;
  await userRepository.save(user);

  const resetUrl = new URL('/reset-password', env.frontendUrl);
  resetUrl.searchParams.set('email', user.email);
  resetUrl.searchParams.set('token', resetToken);

  await mailer.sendMail({
    from: env.smtp.from,
    to: user.email,
    subject: 'Reset your AssetFlow password',
    text: [
      'We received a request to reset your AssetFlow password.',
      `Reset it here: ${resetUrl.toString()}`,
      'This link expires in 30 minutes.'
    ].join('\n\n'),
    html: `
      <p>We received a request to reset your AssetFlow password.</p>
      <p><a href="${resetUrl.toString()}">Reset your password</a></p>
      <p>This link expires in 30 minutes.</p>
    `
  });

  return res.json({ message: 'If the account exists, a reset email has been sent.' });
});

authRouter.post('/reset-password', async (req, res) => {
  const { email, token, password } = req.body as { email?: string; token?: string; password?: string };

  if (!email || !token || !password) {
    return res.status(400).json({ message: 'Email, token, and password are required' });
  }

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { email } });

  if (
    !user ||
    !user.isActive ||
    !user.passwordResetToken ||
    !user.passwordResetExpiresAt ||
    user.passwordResetExpiresAt.getTime() < Date.now()
  ) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  if (user.passwordResetToken !== hashResetToken(token)) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  user.passwordHash = passwordHash;
  user.passwordResetToken = null;
  user.passwordResetExpiresAt = null;
  await userRepository.save(user);

  return res.json({ message: 'Password reset successfully' });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const employeeRepository = AppDataSource.getRepository(Employee);
  const employee = await employeeRepository.findOne({
    where: { user: { email } },
    relations: {
      user: true,
      department: true
    }
  });

  if (!employee || !employee.user || !employee.user.isActive || !employee.isActive) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordMatches = await bcrypt.compare(password, employee.user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  employee.user.lastLoginAt = new Date();
  await AppDataSource.getRepository(User).save(employee.user);

  await logAudit(
    employee.id,
    'LOGIN',
    'User',
    employee.user.id,
    { email: employee.user.email }
  );

  const token = signAuthToken({
    employeeId: employee.id,
    userId: employee.user.id,
    role: employee.role,
    email: employee.user.email,
    employeeCode: employee.employeeCode,
    name: employee.name
  });

  return res.json({
    token,
    user: {
      employeeId: employee.id,
      userId: employee.user.id,
      role: employee.role,
      email: employee.user.email,
      employeeCode: employee.employeeCode,
      name: employee.name,
      department: employee.department?.name ?? null
    }
  });
});

authRouter.get('/me', authenticateToken, async (req, res) => {
  return res.json({ user: req.auth });
});