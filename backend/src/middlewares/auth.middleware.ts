import { NextFunction, Request, Response } from 'express';
import { EmployeeRole } from '../entities/Employee';
import { verifyAuthToken } from '../auth/jwt';

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authorizationHeader = req.headers.authorization;
  const token = authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length)
    : null;

  if (!token) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    req.auth = verifyAuthToken(token);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(...allowedRoles: EmployeeRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };
}