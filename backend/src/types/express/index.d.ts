import { EmployeeRole } from '../../entities/Employee';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        employeeId: string;
        userId: string;
        role: EmployeeRole;
        email: string;
        employeeCode: string;
        name: string;
      };
    }
  }
}

export {};