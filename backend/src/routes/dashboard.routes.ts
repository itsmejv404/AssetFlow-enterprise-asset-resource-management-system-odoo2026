import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { EmployeeRole } from '../entities/Employee';

export const dashboardRouter = Router();

dashboardRouter.get('/admin', authenticateToken, requireRole(EmployeeRole.ADMIN), (req, res) => {
  res.json({
    dashboard: 'admin',
    title: 'Admin Dashboard',
    user: req.auth
  });
});

dashboardRouter.get('/asset-manager', authenticateToken, requireRole(EmployeeRole.ASSET_MANAGER), (req, res) => {
  res.json({
    dashboard: 'asset-manager',
    title: 'Asset Manager Dashboard',
    user: req.auth
  });
});

dashboardRouter.get('/department-head', authenticateToken, requireRole(EmployeeRole.DEPARTMENT_HEAD), (req, res) => {
  res.json({
    dashboard: 'department-head',
    title: 'Department Head Dashboard',
    user: req.auth
  });
});

dashboardRouter.get('/employee', authenticateToken, requireRole(EmployeeRole.EMPLOYEE), (req, res) => {
  res.json({
    dashboard: 'employee',
    title: 'Employee Dashboard',
    user: req.auth
  });
});