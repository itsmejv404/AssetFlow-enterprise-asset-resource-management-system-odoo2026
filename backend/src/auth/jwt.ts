import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { EmployeeRole } from '../entities/Employee';

export interface AuthTokenPayload {
  employeeId: string;
  userId: string;
  role: EmployeeRole;
  email: string;
  employeeCode: string;
  name: string;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  const signOptions: SignOptions = {
    expiresIn: env.auth.jwtExpiresIn as SignOptions['expiresIn']
  };

  return jwt.sign(payload, env.auth.jwtSecret, signOptions);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.auth.jwtSecret) as AuthTokenPayload;
}