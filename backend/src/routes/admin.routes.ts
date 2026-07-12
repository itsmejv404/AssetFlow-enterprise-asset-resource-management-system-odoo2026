import { Router, Request, Response } from 'express';
import { In, EntityManager } from 'typeorm';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AppDataSource } from '../config/data-source';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { Employee, EmployeeRole } from '../entities/Employee';
import { User } from '../entities/User';
import { Department, DepartmentStatus } from '../entities/Department';
import { AssetCategory } from '../entities/AssetCategory';
import { Asset, AssetStatus } from '../entities/Asset';
import { AssetAllocation, AllocationStatus } from '../entities/AssetAllocation';
import { AssetStatusTransitionLog } from '../entities/AssetStatusTransitionLog';
import { AuditCycle, AuditCycleStatus } from '../entities/AuditCycle';
import { AuditRecord, AuditRecordResult } from '../entities/AuditRecord';
import { BookableResource } from '../entities/BookableResource';
import { ResourceBooking } from '../entities/ResourceBooking';
import { TransferRequest, TransferRequestStatus } from '../entities/TransferRequest';
import { Notification } from '../entities/Notification';
import { ActivityLog } from '../entities/ActivityLog';
import { MaintenanceRequest, MaintenanceRequestStatus } from '../entities/MaintenanceRequest';
import { logAudit } from '../utils/audit';
import { mailer } from '../utils/mailer';
import { env } from '../config/env';

export const adminRouter = Router();

adminRouter.use(authenticateToken);
adminRouter.use(requireRole(EmployeeRole.ADMIN));

async function deleteEmployeeCascade(employeeId: string, manager: EntityManager) {
  const employeeRepo = manager.getRepository(Employee);
  const userRepo = manager.getRepository(User);

  const emp = await employeeRepo.findOne({
    where: { id: employeeId },
    relations: { user: true }
  });

  if (!emp) return;

  await manager.getRepository(ResourceBooking).delete({ bookedBy: { id: employeeId } });

  await manager.getRepository(TransferRequest).delete([
    { requestedBy: { id: employeeId } },
    { requestedToEmployee: { id: employeeId } },
    { approvedBy: { id: employeeId } }
  ]);

  await manager.getRepository(MaintenanceRequest).delete([
    { raisedBy: { id: employeeId } },
    { approvedOrRejectedBy: { id: employeeId } }
  ]);

  await manager.getRepository(AssetAllocation).delete([
    { allocatedToEmployee: { id: employeeId } },
    { allocatedBy: { id: employeeId } },
    { returnApprovedBy: { id: employeeId } }
  ]);

  await manager.getRepository(AuditRecord).delete([
    { verifiedByAuditor: { id: employeeId } },
    { discrepancyResolvedBy: { id: employeeId } }
  ]);

  const auditCycles = await manager.getRepository(AuditCycle).find({
    where: [
      { createdBy: { id: employeeId } },
      { closedBy: { id: employeeId } }
    ]
  });
  for (const ac of auditCycles) {
    await manager.getRepository(AuditRecord).delete({ auditCycle: { id: ac.id } });
    await manager.getRepository(AuditCycle).delete(ac.id);
  }

  await manager.getRepository(Notification).delete({ recipient: { id: employeeId } });

  await manager.getRepository(Department).update(
    { departmentHead: { id: employeeId } },
    { departmentHead: null }
  );

  await manager.getRepository(Asset).update(
    { currentHolderEmployee: { id: employeeId } },
    { currentHolderEmployee: null }
  );

  await employeeRepo.delete(employeeId);

  if (emp.user) {
    await userRepo.delete(emp.user.id);
  }
}

async function deleteAssetCascade(assetId: string, manager: EntityManager) {
  const assetRepo = manager.getRepository(Asset);
  const asset = await assetRepo.findOne({ where: { id: assetId } });

  if (!asset) return;

  if (asset.documentUrls && Array.isArray(asset.documentUrls)) {
    for (const docUrl of asset.documentUrls) {
      const relativePath = docUrl.replace(/^\/uploads\//, 'uploads/');
      const absolutePath = path.join(__dirname, '../../', relativePath);
      try {
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch (err) {
        console.error(`Failed to delete file ${absolutePath}:`, err);
      }
    }
  }

  await manager.getRepository(AuditRecord).delete({ asset: { id: assetId } });

  await manager.getRepository(TransferRequest).delete({ asset: { id: assetId } });

  await manager.getRepository(AssetAllocation).delete({ asset: { id: assetId } });

  await manager.getRepository(MaintenanceRequest).delete({ asset: { id: assetId } });

  await manager.getRepository(AssetStatusTransitionLog).delete({ asset: { id: assetId } });

  const bookableResource = await manager.getRepository(BookableResource).findOne({
    where: { linkedAsset: { id: assetId } }
  });
  if (bookableResource) {
    await manager.getRepository(ResourceBooking).delete({ resource: { id: bookableResource.id } });
    await manager.getRepository(BookableResource).delete(bookableResource.id);
  }

  await assetRepo.delete(assetId);
}

async function deleteCategoryCascade(categoryId: string, manager: EntityManager) {
  const categoryRepo = manager.getRepository(AssetCategory);
  const assetRepo = manager.getRepository(Asset);

  const assets = await assetRepo.find({ where: { category: { id: categoryId } } });

  for (const asset of assets) {
    await deleteAssetCascade(asset.id, manager);
  }

  await categoryRepo.delete(categoryId);
}

async function deleteDepartmentCascade(departmentId: string, manager: EntityManager) {
  const deptRepo = manager.getRepository(Department);
  const employeeRepo = manager.getRepository(Employee);

  const getSubDepts = async (id: string): Promise<string[]> => {
    const children = await deptRepo.find({ where: { parentDepartment: { id } } });
    let ids = children.map(c => c.id);
    for (const child of children) {
      const childIds = await getSubDepts(child.id);
      ids = ids.concat(childIds);
    }
    return ids;
  };

  const allDeptIds = [departmentId, ...(await getSubDepts(departmentId))];

  const employees = await employeeRepo.find({
    where: { department: { id: In(allDeptIds) } }
  });

  for (const emp of employees) {
    await deleteEmployeeCascade(emp.id, manager);
  }

  for (let i = allDeptIds.length - 1; i >= 0; i--) {
    await deptRepo.delete(allDeptIds[i]);
  }
}

function getAuth(req: Request) {
  return req.auth!;
}


adminRouter.get('/departments', async (req, res) => {
  try {
    const deptRepo = AppDataSource.getRepository(Department);
    const departments = await deptRepo.find({
      relations: {
        departmentHead: true,
        parentDepartment: true
      },
      withDeleted: true
    });

    const employeeRepo = AppDataSource.getRepository(Employee);
    const result = [];
    for (const dept of departments) {
      const employeeCount = await employeeRepo.count({ where: { department: { id: dept.id } } });
      result.push({
        ...dept,
        employeeCount
      });
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/departments', async (req, res) => {
  const auth = getAuth(req);
  const { name, code, parentDepartmentId } = req.body as {
    name?: string;
    code?: string;
    parentDepartmentId?: string | null;
  };

  if (!name || !code) {
    return res.status(400).json({ message: 'Name and code are required' });
  }

  try {
    const deptRepo = AppDataSource.getRepository(Department);

    const existingName = await deptRepo.findOne({ where: { name }, withDeleted: true });
    if (existingName) {
      return res.status(400).json({ message: 'Department name already exists' });
    }
    const existingCode = await deptRepo.findOne({ where: { code }, withDeleted: true });
    if (existingCode) {
      return res.status(400).json({ message: 'Department code already exists' });
    }

    let parentDept: Department | null = null;
    if (parentDepartmentId) {
      parentDept = await deptRepo.findOne({ where: { id: parentDepartmentId } });
      if (!parentDept) {
        return res.status(400).json({ message: 'Parent department not found' });
      }
    }

    const department = deptRepo.create({
      name,
      code,
      parentDepartment: parentDept || undefined,
      status: DepartmentStatus.ACTIVE
    });

    await deptRepo.save(department);

    await logAudit(
      auth.employeeId,
      'CREATE',
      'Department',
      department.id,
      { name, code }
    );

    return res.status(201).json(department);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.put('/departments/:id', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;
  const { name, code, parentDepartmentId, departmentHeadId, status } = req.body as {
    name?: string;
    code?: string;
    parentDepartmentId?: string | null;
    departmentHeadId?: string | null;
    status?: DepartmentStatus;
  };

  try {
    const deptRepo = AppDataSource.getRepository(Department);
    const department = await deptRepo.findOne({ where: { id }, withDeleted: true });

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    if (name && name !== department.name) {
      const existingName = await deptRepo.findOne({ where: { name }, withDeleted: true });
      if (existingName && existingName.id !== id) {
        return res.status(400).json({ message: 'Department name already exists' });
      }
      department.name = name;
    }

    if (code && code !== department.code) {
      const existingCode = await deptRepo.findOne({ where: { code }, withDeleted: true });
      if (existingCode && existingCode.id !== id) {
        return res.status(400).json({ message: 'Department code already exists' });
      }
      department.code = code;
    }

    if (parentDepartmentId !== undefined) {
      if (parentDepartmentId === null) {
        department.parentDepartment = null;
      } else {
        if (parentDepartmentId === id) {
          return res.status(400).json({ message: 'A department cannot be its own parent' });
        }
        const parentDept = await deptRepo.findOne({ where: { id: parentDepartmentId } });
        if (!parentDept) {
          return res.status(400).json({ message: 'Parent department not found' });
        }
        department.parentDepartment = parentDept;
      }
    }

    if (departmentHeadId !== undefined) {
      if (departmentHeadId === null) {
        department.departmentHead = null;
      } else {
        const employeeRepo = AppDataSource.getRepository(Employee);
        const emp = await employeeRepo.findOne({ where: { id: departmentHeadId } });
        if (!emp) {
          return res.status(400).json({ message: 'Employee not found' });
        }
        department.departmentHead = emp;
      }
    }

    if (status) {
      department.status = status;
      if (status === DepartmentStatus.INACTIVE) {
        department.deletedAt = new Date();
      } else {
        department.deletedAt = null;
      }
    }

    await deptRepo.save(department);

    await logAudit(
      auth.employeeId,
      'UPDATE',
      'Department',
      department.id,
      { name, code, status }
    );

    return res.json(department);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/departments/:id/deactivate', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const deptRepo = AppDataSource.getRepository(Department);
    const department = await deptRepo.findOne({ where: { id } });

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    department.status = DepartmentStatus.INACTIVE;
    department.deletedAt = new Date();
    await deptRepo.save(department);

    await logAudit(
      auth.employeeId,
      'DEACTIVATE',
      'Department',
      id
    );

    return res.json({ message: 'Department deactivated successfully', department });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.delete('/departments/:id', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const deptRepo = AppDataSource.getRepository(Department);
    const department = await deptRepo.findOne({ where: { id }, withDeleted: true });

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    await AppDataSource.transaction(async (manager) => {
      await deleteDepartmentCascade(id, manager);
    });

    await logAudit(
      auth.employeeId,
      'DELETE',
      'Department',
      id,
      { name: department.name, code: department.code }
    );

    return res.json({ message: 'Department permanently deleted with all related data (cascade delete)' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});


adminRouter.get('/asset-categories', async (req, res) => {
  try {
    const categoryRepo = AppDataSource.getRepository(AssetCategory);
    const categories = await categoryRepo.find();
    return res.json(categories);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/asset-categories', async (req, res) => {
  const auth = getAuth(req);
  const { name, description, customFieldSchema } = req.body as {
    name?: string;
    description?: string;
    customFieldSchema?: Array<Record<string, unknown>>;
  };

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    const categoryRepo = AppDataSource.getRepository(AssetCategory);

    const existing = await categoryRepo.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ message: 'Asset Category name already exists' });
    }

    const category = categoryRepo.create({
      name,
      description,
      customFieldSchema: customFieldSchema || [],
      isActive: true
    });

    await categoryRepo.save(category);

    await logAudit(
      auth.employeeId,
      'CREATE',
      'AssetCategory',
      category.id,
      { name }
    );

    return res.status(201).json(category);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.put('/asset-categories/:id', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;
  const { name, description, customFieldSchema, isActive } = req.body as {
    name?: string;
    description?: string;
    customFieldSchema?: Array<Record<string, unknown>>;
    isActive?: boolean;
  };

  try {
    const categoryRepo = AppDataSource.getRepository(AssetCategory);
    const category = await categoryRepo.findOne({ where: { id } });

    if (!category) {
      return res.status(404).json({ message: 'Asset Category not found' });
    }

    if (name && name !== category.name) {
      const existingName = await categoryRepo.findOne({ where: { name } });
      if (existingName && existingName.id !== id) {
        return res.status(400).json({ message: 'Asset Category name already exists' });
      }
      category.name = name;
    }

    if (description !== undefined) {
      category.description = description;
    }

    if (customFieldSchema !== undefined) {
      category.customFieldSchema = customFieldSchema;
    }

    if (isActive !== undefined) {
      category.isActive = isActive;
    }

    await categoryRepo.save(category);

    await logAudit(
      auth.employeeId,
      'UPDATE',
      'AssetCategory',
      category.id,
      { name, isActive }
    );

    return res.json(category);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/asset-categories/:id/deactivate', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const categoryRepo = AppDataSource.getRepository(AssetCategory);
    const category = await categoryRepo.findOne({ where: { id } });

    if (!category) {
      return res.status(404).json({ message: 'Asset Category not found' });
    }

    category.isActive = false;
    await categoryRepo.save(category);

    await logAudit(
      auth.employeeId,
      'DEACTIVATE',
      'AssetCategory',
      id
    );

    return res.json({ message: 'Asset Category deactivated successfully', category });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.delete('/asset-categories/:id', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const categoryRepo = AppDataSource.getRepository(AssetCategory);
    const category = await categoryRepo.findOne({ where: { id } });

    if (!category) {
      return res.status(404).json({ message: 'Asset category not found' });
    }

    await AppDataSource.transaction(async (manager) => {
      await deleteCategoryCascade(id, manager);
    });

    await logAudit(
      auth.employeeId,
      'DELETE',
      'AssetCategory',
      id,
      { name: category.name }
    );

    return res.json({ message: 'Asset category permanently deleted with all associated assets and records' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});


adminRouter.get('/employees', async (req, res) => {
  try {
    const employeeRepo = AppDataSource.getRepository(Employee);
    const employees = await employeeRepo.find({
      relations: {
        user: true,
        department: true
      }
    });
    return res.json(employees);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/employees', async (req, res) => {
  const auth = getAuth(req);
  const { name, email, departmentId, role } = req.body as {
    name?: string;
    email?: string;
    departmentId?: string | null;
    role?: EmployeeRole;
  };

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  try {
    const userRepo = AppDataSource.getRepository(User);
    const employeeRepo = AppDataSource.getRepository(Employee);

    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email address already exists' });
    }

    let department: Department | null = null;
    if (departmentId) {
      department = await AppDataSource.getRepository(Department).findOne({ where: { id: departmentId } });
      if (!department) {
        return res.status(400).json({ message: 'Department not found' });
      }
    }

    const tempPassword = crypto.randomBytes(12).toString('hex') + 'A1!'; 
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = userRepo.create({
      email,
      passwordHash,
      isActive: true
    });
    await userRepo.save(user);

    const employee = employeeRepo.create({
      name,
      user,
      department: department || undefined,
      role: role || EmployeeRole.EMPLOYEE,
      isActive: true
    });
    await employeeRepo.save(employee);

    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const passwordResetExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); 

    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpiresAt = passwordResetExpiresAt;
    await userRepo.save(user);

    const resetUrl = new URL('/reset-password', env.frontendUrl);
    resetUrl.searchParams.set('email', user.email);
    resetUrl.searchParams.set('token', resetToken);

    try {
      await mailer.sendMail({
        from: env.smtp.from,
        to: user.email,
        subject: 'Welcome to AssetFlow - Set Your Password',
        text: `Welcome to AssetFlow, ${name}!\n\nYour administrator has created your account.\nPlease set your password using the link below:\n\n${resetUrl.toString()}\n\nThis link is valid for 24 hours.`,
        html: `
          <h3>Welcome to AssetFlow, ${name}!</h3>
          <p>Your administrator has created your account.</p>
          <p><a href="${resetUrl.toString()}">Set your password</a></p>
          <p>This link is valid for 24 hours.</p>
        `
      });
    } catch (mailError) {
      console.error('Failed to send onboarding email:', mailError);
    }

    await logAudit(
      auth.employeeId,
      'CREATE',
      'Employee',
      employee.id,
      { name, email, role }
    );

    return res.status(201).json({
      employee,
      message: 'Employee created and onboarding email sent successfully.'
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.put('/employees/:id', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;
  const { name, email, departmentId } = req.body as {
    name?: string;
    email?: string;
    departmentId?: string | null;
  };

  try {
    const employeeRepo = AppDataSource.getRepository(Employee);
    const userRepo = AppDataSource.getRepository(User);

    const employee = await employeeRepo.findOne({
      where: { id },
      relations: { user: true }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (name) {
      employee.name = name;
    }

    if (email && employee.user) {
      const existingUser = await userRepo.findOne({ where: { email } });
      if (existingUser && existingUser.id !== employee.user.id) {
        return res.status(400).json({ message: 'Email address already exists' });
      }
      employee.user.email = email;
      await userRepo.save(employee.user);
    }

    if (departmentId !== undefined) {
      if (departmentId === null) {
        employee.department = null;
      } else {
        const department = await AppDataSource.getRepository(Department).findOne({ where: { id: departmentId } });
        if (!department) {
          return res.status(400).json({ message: 'Department not found' });
        }
        employee.department = department;
      }
    }

    await employeeRepo.save(employee);

    await logAudit(
      auth.employeeId,
      'UPDATE',
      'Employee',
      employee.id,
      { name, email }
    );

    return res.json(employee);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/employees/:id/deactivate', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const employeeRepo = AppDataSource.getRepository(Employee);
    const userRepo = AppDataSource.getRepository(User);

    const employee = await employeeRepo.findOne({
      where: { id },
      relations: { user: true }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employee.isActive = false;
    await employeeRepo.save(employee);

    if (employee.user) {
      employee.user.isActive = false;
      await userRepo.save(employee.user);
    }

    await logAudit(
      auth.employeeId,
      'DEACTIVATE',
      'Employee',
      id
    );

    return res.json({ message: 'Employee deactivated successfully', employee: { id: employee.id, isActive: employee.isActive } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/employees/:id/reactivate', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const employeeRepo = AppDataSource.getRepository(Employee);
    const userRepo = AppDataSource.getRepository(User);

    const employee = await employeeRepo.findOne({
      where: { id },
      relations: { user: true }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employee.isActive = true;
    await employeeRepo.save(employee);

    if (employee.user) {
      employee.user.isActive = true;
      await userRepo.save(employee.user);
    }

    await logAudit(
      auth.employeeId,
      'REACTIVATE',
      'Employee',
      id
    );

    return res.json({ message: 'Employee reactivated successfully', employee: { id: employee.id, isActive: employee.isActive } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.delete('/employees/:id', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const employeeRepo = AppDataSource.getRepository(Employee);
    const employee = await employeeRepo.findOne({ where: { id } });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await AppDataSource.transaction(async (manager) => {
      await deleteEmployeeCascade(id, manager);
    });

    await logAudit(
      auth.employeeId,
      'DELETE',
      'Employee',
      id,
      { name: employee.name }
    );

    return res.json({ message: 'Employee permanently deleted with all related transactional data' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/employees/:id/change-role', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;
  const { role, departmentId } = req.body as {
    role: EmployeeRole;
    departmentId?: string;
  };

  if (!role) {
    return res.status(400).json({ message: 'Role is required' });
  }

  if (role !== EmployeeRole.EMPLOYEE && role !== EmployeeRole.ASSET_MANAGER && role !== EmployeeRole.DEPARTMENT_HEAD) {
    return res.status(400).json({ message: 'Invalid role for change role operation' });
  }

  try {
    const employeeRepo = AppDataSource.getRepository(Employee);
    const departmentRepo = AppDataSource.getRepository(Department);

    const employee = await employeeRepo.findOne({ where: { id }, relations: { department: true } });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const oldRole = employee.role;

    await AppDataSource.transaction(async (manager) => {
      if (oldRole === EmployeeRole.DEPARTMENT_HEAD) {
        const depts = await manager.getRepository(Department).find({ where: { departmentHead: { id } } });
        for (const dept of depts) {
          dept.departmentHead = null;
          await manager.save(dept);
        }
      }

      employee.role = role;

      if (role === EmployeeRole.DEPARTMENT_HEAD) {
        if (!departmentId) {
          throw new Error('Department ID is required when changing role to Department Head');
        }
        const department = await manager.getRepository(Department).findOne({ where: { id: departmentId } });
        if (!department) {
          throw new Error('Department not found');
        }
        employee.department = department;
        employee.promotedBy = auth.employeeId;
        employee.promotedAt = new Date();
        
        department.departmentHead = employee;
        await manager.save(department);
      } else {
        employee.promotedBy = null;
        employee.promotedAt = null;
        if (departmentId) {
          const department = await manager.getRepository(Department).findOne({ where: { id: departmentId } });
          if (department) {
            employee.department = department;
          }
        }
      }

      await manager.save(employee);
    });

    await logAudit(
      auth.employeeId,
      'CHANGE_ROLE',
      'Employee',
      id,
      { oldRole, newRole: role, departmentId }
    );

    const resultEmployee = {
      id: employee.id,
      employeeCode: employee.employeeCode,
      name: employee.name,
      role: employee.role,
      isActive: employee.isActive,
      department: employee.department ? { id: employee.department.id, name: employee.department.name } : null
    };

    return res.json({ message: 'Employee role changed successfully', employee: resultEmployee });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});


adminRouter.get('/assets', async (req, res) => {
  try {
    const assetRepo = AppDataSource.getRepository(Asset);
    const assets = await assetRepo.find({
      relations: {
        category: true,
        currentHolderEmployee: true,
        currentHolderDepartment: true
      },
      withDeleted: true
    });
    return res.json(assets);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/assets', async (req, res) => {
  const auth = getAuth(req);
  const {
    name,
    categoryId,
    serialNumber,
    acquisitionDate,
    acquisitionCost,
    condition,
    location,
    categorySpecificFields,
    isBookable
  } = req.body as {
    name?: string;
    categoryId?: string;
    serialNumber?: string;
    acquisitionDate?: string;
    acquisitionCost?: string;
    condition?: string;
    location?: string;
    categorySpecificFields?: Record<string, unknown>;
    isBookable?: boolean;
  };

  if (!name || !categoryId) {
    return res.status(400).json({ message: 'Name and categoryId are required' });
  }

  try {
    const categoryRepo = AppDataSource.getRepository(AssetCategory);
    const assetRepo = AppDataSource.getRepository(Asset);

    const category = await categoryRepo.findOne({ where: { id: categoryId } });
    if (!category) {
      return res.status(400).json({ message: 'Asset Category not found' });
    }

    const asset = assetRepo.create({
      name,
      category,
      serialNumber,
      acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : undefined,
      acquisitionCost,
      condition,
      location,
      categorySpecificFields: categorySpecificFields || {},
      isBookable: isBookable || false,
      status: AssetStatus.AVAILABLE,
      documentUrls: []
    });

    await assetRepo.save(asset);

    await logAudit(
      auth.employeeId,
      'CREATE',
      'Asset',
      asset.id,
      { name, serialNumber }
    );

    return res.status(201).json(asset);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.put('/assets/:id', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;
  const {
    name,
    categoryId,
    serialNumber,
    acquisitionDate,
    acquisitionCost,
    condition,
    location,
    categorySpecificFields,
    isBookable,
    status
  } = req.body as {
    name?: string;
    categoryId?: string;
    serialNumber?: string;
    acquisitionDate?: string;
    acquisitionCost?: string;
    condition?: string;
    location?: string;
    categorySpecificFields?: Record<string, unknown>;
    isBookable?: boolean;
    status?: AssetStatus;
  };

  try {
    const assetRepo = AppDataSource.getRepository(Asset);
    const asset = await assetRepo.findOne({
      where: { id },
      relations: { category: true },
      withDeleted: true
    });

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (name) asset.name = name;

    if (categoryId) {
      const category = await AppDataSource.getRepository(AssetCategory).findOne({ where: { id: categoryId } });
      if (!category) {
        return res.status(400).json({ message: 'Asset Category not found' });
      }
      asset.category = category;
    }

    if (serialNumber !== undefined) asset.serialNumber = serialNumber;
    if (acquisitionDate !== undefined) asset.acquisitionDate = acquisitionDate ? new Date(acquisitionDate) : null;
    if (acquisitionCost !== undefined) asset.acquisitionCost = acquisitionCost;
    if (condition !== undefined) asset.condition = condition;
    if (location !== undefined) asset.location = location;
    if (categorySpecificFields !== undefined) asset.categorySpecificFields = categorySpecificFields;
    if (isBookable !== undefined) asset.isBookable = isBookable;

    if (status && status !== asset.status) {
      const transitionRepo = AppDataSource.getRepository(AssetStatusTransitionLog);
      const transition = transitionRepo.create({
        asset,
        fromStatus: asset.status,
        toStatus: status,
        reason: 'Administrator updated asset details',
        triggeredBy: { id: auth.employeeId } as Employee
      });
      await transitionRepo.save(transition);

      asset.status = status;
    }

    await assetRepo.save(asset);

    await logAudit(
      auth.employeeId,
      'UPDATE',
      'Asset',
      asset.id,
      { name, status }
    );

    return res.json(asset);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/assets/:id/retire', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const assetRepo = AppDataSource.getRepository(Asset);
    const asset = await assetRepo.findOne({ where: { id } });

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (asset.status === AssetStatus.RETIRED) {
      return res.status(400).json({ message: 'Asset is already retired' });
    }

    const transitionRepo = AppDataSource.getRepository(AssetStatusTransitionLog);
    const transition = transitionRepo.create({
      asset,
      fromStatus: asset.status,
      toStatus: AssetStatus.RETIRED,
      reason: 'Administrator retired the asset',
      triggeredBy: { id: auth.employeeId } as Employee
    });
    await transitionRepo.save(transition);

    asset.status = AssetStatus.RETIRED;
    asset.deletedAt = new Date(); 
    await assetRepo.save(asset);

    await logAudit(
      auth.employeeId,
      'RETIRE',
      'Asset',
      id
    );

    return res.json({ message: 'Asset retired successfully', asset });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/assets/:id/dispose', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const assetRepo = AppDataSource.getRepository(Asset);
    const asset = await assetRepo.findOne({ where: { id } });

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (asset.status === AssetStatus.DISPOSED) {
      return res.status(400).json({ message: 'Asset is already disposed' });
    }

    const transitionRepo = AppDataSource.getRepository(AssetStatusTransitionLog);
    const transition = transitionRepo.create({
      asset,
      fromStatus: asset.status,
      toStatus: AssetStatus.DISPOSED,
      reason: 'Administrator disposed the asset',
      triggeredBy: { id: auth.employeeId } as Employee
    });
    await transitionRepo.save(transition);

    asset.status = AssetStatus.DISPOSED;
    asset.deletedAt = new Date(); 
    await assetRepo.save(asset);

    await logAudit(
      auth.employeeId,
      'DISPOSE',
      'Asset',
      id
    );

    return res.json({ message: 'Asset disposed successfully', asset });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/assets/:id/documents', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;
  const { name, data } = req.body as { name?: string; data?: string };

  if (!name || !data) {
    return res.status(400).json({ message: 'Name and Base64 data are required' });
  }

  try {
    const assetRepo = AppDataSource.getRepository(Asset);
    const asset = await assetRepo.findOne({ where: { id }, withDeleted: true });

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    const safeName = name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uploadDir = path.join(__dirname, '../../uploads/assets', id);
    fs.mkdirSync(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, safeName);
    const base64Content = data.includes('base64,') ? data.split('base64,')[1] : data;
    fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));

    const docUrl = `/uploads/assets/${id}/${safeName}`;
    if (!asset.documentUrls) {
      asset.documentUrls = [];
    }

    if (!asset.documentUrls.includes(docUrl)) {
      asset.documentUrls.push(docUrl);
    }

    await assetRepo.save(asset);

    await logAudit(
      auth.employeeId,
      'UPLOAD_DOCUMENT',
      'Asset',
      id,
      { filename: safeName }
    );

    return res.json({ message: 'Document uploaded successfully', asset });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.delete('/assets/:id/documents/:filename', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;
  const filename = req.params.filename;

  try {
    const assetRepo = AppDataSource.getRepository(Asset);
    const asset = await assetRepo.findOne({ where: { id }, withDeleted: true });

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const docUrl = `/uploads/assets/${id}/${safeFilename}`;

    if (asset.documentUrls && asset.documentUrls.includes(docUrl)) {
      asset.documentUrls = asset.documentUrls.filter((url) => url !== docUrl);
      await assetRepo.save(asset);

      const filePath = path.join(__dirname, '../../uploads/assets', id, safeFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await logAudit(
        auth.employeeId,
        'DELETE_DOCUMENT',
        'Asset',
        id,
        { filename: safeFilename }
      );

      return res.json({ message: 'Document deleted successfully', asset });
    }

    return res.status(404).json({ message: 'Document not found on this asset' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});


adminRouter.get('/allocations', async (req, res) => {
  try {
    const allocationRepo = AppDataSource.getRepository(AssetAllocation);
    const allocations = await allocationRepo.find({
      relations: {
        asset: true,
        allocatedToEmployee: true,
        allocatedToDepartment: true,
        allocatedBy: true
      }
    });
    return res.json(allocations);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/allocations', async (req, res) => {
  const auth = getAuth(req);
  const { assetId, employeeId, departmentId, expectedReturnDate } = req.body as {
    assetId: string;
    employeeId?: string;
    departmentId?: string;
    expectedReturnDate?: string;
  };

  if (!assetId) {
    return res.status(400).json({ message: 'AssetId is required' });
  }

  try {
    const assetRepo = AppDataSource.getRepository(Asset);
    const employeeRepo = AppDataSource.getRepository(Employee);
    const departmentRepo = AppDataSource.getRepository(Department);
    const allocationRepo = AppDataSource.getRepository(AssetAllocation);

    const asset = await assetRepo.findOne({ where: { id: assetId } });
    if (!asset) {
      return res.status(400).json({ message: 'Asset not found' });
    }

    if (asset.status === AssetStatus.RETIRED || asset.status === AssetStatus.DISPOSED) {
      return res.status(400).json({ message: 'Cannot allocate retired or disposed asset' });
    }

    let employee: Employee | null = null;
    if (employeeId) {
      employee = await employeeRepo.findOne({ where: { id: employeeId } });
      if (!employee) {
        return res.status(400).json({ message: 'Employee not found' });
      }
    }

    let department: Department | null = null;
    if (departmentId) {
      department = await departmentRepo.findOne({ where: { id: departmentId } });
      if (!department) {
        return res.status(400).json({ message: 'Department not found' });
      }
    }

    if (!employee && !department) {
      return res.status(400).json({ message: 'Either employeeId or departmentId must be provided' });
    }

    const activeAlloc = await allocationRepo.findOne({
      where: { asset: { id: asset.id }, status: AllocationStatus.ACTIVE }
    });
    if (activeAlloc) {
      activeAlloc.status = AllocationStatus.RETURNED;
      activeAlloc.actualReturnDate = new Date();
      await allocationRepo.save(activeAlloc);
    }

    const allocation = allocationRepo.create({
      asset,
      allocatedToEmployee: employee || undefined,
      allocatedToDepartment: department || undefined,
      allocatedDate: new Date(),
      expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : undefined,
      status: AllocationStatus.ACTIVE,
      allocatedBy: { id: auth.employeeId } as Employee
    });

    await allocationRepo.save(allocation);

    asset.status = AssetStatus.ALLOCATED;
    asset.currentHolderEmployee = employee;
    asset.currentHolderDepartment = department;
    await assetRepo.save(asset);

    await logAudit(
      auth.employeeId,
      'ALLOCATE',
      'Asset',
      asset.id,
      { employeeId, departmentId, allocationId: allocation.id }
    );

    return res.status(201).json(allocation);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.get('/transfers', async (req, res) => {
  try {
    const transferRepo = AppDataSource.getRepository(TransferRequest);
    const transfers = await transferRepo.find({
      relations: {
        asset: true,
        currentAllocation: true,
        requestedBy: true,
        requestedToEmployee: true,
        requestedToDepartment: true,
        approvedBy: true
      }
    });
    return res.json(transfers);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/transfers/:id/approve', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const transferRepo = AppDataSource.getRepository(TransferRequest);
    const allocationRepo = AppDataSource.getRepository(AssetAllocation);
    const assetRepo = AppDataSource.getRepository(Asset);

    const transfer = await transferRepo.findOne({
      where: { id },
      relations: {
        asset: true,
        currentAllocation: true,
        requestedBy: true,
        requestedToEmployee: true,
        requestedToDepartment: true
      }
    });

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    if (transfer.status !== TransferRequestStatus.REQUESTED) {
      return res.status(400).json({ message: 'Transfer request is not in requested status' });
    }

    await AppDataSource.transaction(async (manager) => {
      const currentAlloc = transfer.currentAllocation;
      if (currentAlloc) {
        currentAlloc.status = AllocationStatus.TRANSFERRED;
        currentAlloc.actualReturnDate = new Date();
        await manager.save(currentAlloc);
      }

      const newAlloc = allocationRepo.create({
        asset: transfer.asset,
        allocatedToEmployee: transfer.requestedToEmployee || undefined,
        allocatedToDepartment: transfer.requestedToDepartment || undefined,
        allocatedDate: new Date(),
        status: AllocationStatus.ACTIVE,
        allocatedBy: { id: auth.employeeId } as Employee
      });
      await manager.save(newAlloc);

      const asset = transfer.asset;
      asset.status = AssetStatus.ALLOCATED;
      asset.currentHolderEmployee = transfer.requestedToEmployee;
      asset.currentHolderDepartment = transfer.requestedToDepartment;
      await manager.save(asset);

      transfer.status = TransferRequestStatus.COMPLETED;
      transfer.approvedBy = { id: auth.employeeId } as Employee;
      transfer.approvedAt = new Date();
      transfer.resultingAllocation = newAlloc;
      await manager.save(transfer);
    });

    await logAudit(
      auth.employeeId,
      'APPROVE_TRANSFER',
      'TransferRequest',
      id,
      { assetId: transfer.asset.id }
    );

    return res.json({ message: 'Transfer request approved and completed successfully', transfer: { id: transfer.id, status: transfer.status } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/transfers/:id/reject', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;
  const { reason } = req.body as { reason?: string };

  try {
    const transferRepo = AppDataSource.getRepository(TransferRequest);
    const transfer = await transferRepo.findOne({ where: { id }, relations: { asset: true } });

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    if (transfer.status !== TransferRequestStatus.REQUESTED) {
      return res.status(400).json({ message: 'Transfer request is not in requested status' });
    }

    transfer.status = TransferRequestStatus.REJECTED;
    transfer.approvedBy = { id: auth.employeeId } as Employee;
    transfer.approvedAt = new Date();
    transfer.reason = reason || transfer.reason;
    await transferRepo.save(transfer);

    await logAudit(
      auth.employeeId,
      'REJECT_TRANSFER',
      'TransferRequest',
      id,
      { assetId: transfer.asset.id, reason }
    );

    return res.json({ message: 'Transfer request rejected successfully', transfer: { id: transfer.id, status: transfer.status } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.get('/maintenance-requests', async (req, res) => {
  try {
    const maintenanceRepo = AppDataSource.getRepository(MaintenanceRequest);
    const requests = await maintenanceRepo.find({
      relations: {
        asset: true,
        raisedBy: true,
        approvedOrRejectedBy: true
      }
    });
    return res.json(requests);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/maintenance-requests/:id/approve', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const maintenanceRepo = AppDataSource.getRepository(MaintenanceRequest);
    const request = await maintenanceRepo.findOne({ where: { id }, relations: { asset: true } });

    if (!request) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    if (request.status !== MaintenanceRequestStatus.PENDING) {
      return res.status(400).json({ message: 'Maintenance request is not in pending status' });
    }

    request.status = MaintenanceRequestStatus.APPROVED;
    request.approvedOrRejectedBy = { id: auth.employeeId } as Employee;
    await maintenanceRepo.save(request);

    await logAudit(
      auth.employeeId,
      'APPROVE_MAINTENANCE',
      'MaintenanceRequest',
      id,
      { assetId: request.asset.id }
    );

    return res.json({ message: 'Maintenance request approved successfully', request: { id: request.id, status: request.status } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/maintenance-requests/:id/reject', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;
  const { reason } = req.body as { reason?: string };

  try {
    const maintenanceRepo = AppDataSource.getRepository(MaintenanceRequest);
    const request = await maintenanceRepo.findOne({ where: { id }, relations: { asset: true } });

    if (!request) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    if (request.status !== MaintenanceRequestStatus.PENDING) {
      return res.status(400).json({ message: 'Maintenance request is not in pending status' });
    }

    request.status = MaintenanceRequestStatus.REJECTED;
    request.approvedOrRejectedBy = { id: auth.employeeId } as Employee;
    request.rejectionReason = reason || null;
    await maintenanceRepo.save(request);

    await logAudit(
      auth.employeeId,
      'REJECT_MAINTENANCE',
      'MaintenanceRequest',
      id,
      { assetId: request.asset.id, reason }
    );

    return res.json({ message: 'Maintenance request rejected successfully', request: { id: request.id, status: request.status } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/maintenance-requests/:id/assign-technician', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;
  const { technicianName } = req.body as { technicianName?: string };

  if (!technicianName) {
    return res.status(400).json({ message: 'TechnicianName is required' });
  }

  try {
    const maintenanceRepo = AppDataSource.getRepository(MaintenanceRequest);
    const request = await maintenanceRepo.findOne({ where: { id }, relations: { asset: true } });

    if (!request) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    if (request.status !== MaintenanceRequestStatus.APPROVED && request.status !== MaintenanceRequestStatus.TECHNICIAN_ASSIGNED) {
      return res.status(400).json({ message: 'Maintenance request must be approved first' });
    }

    request.status = MaintenanceRequestStatus.TECHNICIAN_ASSIGNED;
    request.technicianName = technicianName;
    await maintenanceRepo.save(request);

    await logAudit(
      auth.employeeId,
      'ASSIGN_TECHNICIAN',
      'MaintenanceRequest',
      id,
      { assetId: request.asset.id, technicianName }
    );

    return res.json({ message: 'Technician assigned successfully', request: { id: request.id, status: request.status, technicianName: request.technicianName } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.get('/audit-cycles', async (req, res) => {
  try {
    const auditCycleRepo = AppDataSource.getRepository(AuditCycle);
    const cycles = await auditCycleRepo.find({
      relations: {
        scopeDepartment: true,
        createdBy: true,
        closedBy: true,
        auditors: true
      }
    });
    return res.json(cycles);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/audit-cycles', async (req, res) => {
  const auth = getAuth(req);
  const { name, scopeDepartmentId, scopeLocation, startDate, endDate } = req.body as {
    name?: string;
    scopeDepartmentId?: string | null;
    scopeLocation?: string | null;
    startDate?: string;
    endDate?: string;
  };

  if (!name || !startDate || !endDate) {
    return res.status(400).json({ message: 'Name, startDate, and endDate are required' });
  }

  try {
    const auditCycleRepo = AppDataSource.getRepository(AuditCycle);
    const deptRepo = AppDataSource.getRepository(Department);

    let scopeDept: Department | null = null;
    if (scopeDepartmentId) {
      scopeDept = await deptRepo.findOne({ where: { id: scopeDepartmentId } });
      if (!scopeDept) {
        return res.status(400).json({ message: 'Scope department not found' });
      }
    }

    const cycle = auditCycleRepo.create({
      name,
      scopeDepartment: scopeDept || undefined,
      scopeLocation: scopeLocation || undefined,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: AuditCycleStatus.PLANNED,
      createdBy: { id: auth.employeeId } as Employee,
      auditors: []
    });

    await auditCycleRepo.save(cycle);

    await logAudit(
      auth.employeeId,
      'CREATE_AUDIT_CYCLE',
      'AuditCycle',
      cycle.id,
      { name }
    );

    return res.status(201).json(cycle);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/audit-cycles/:id/start', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const auditCycleRepo = AppDataSource.getRepository(AuditCycle);
    const assetRepo = AppDataSource.getRepository(Asset);
    const recordRepo = AppDataSource.getRepository(AuditRecord);

    const cycle = await auditCycleRepo.findOne({
      where: { id },
      relations: { scopeDepartment: true }
    });

    if (!cycle) {
      return res.status(404).json({ message: 'Audit cycle not found' });
    }

    if (cycle.status !== AuditCycleStatus.PLANNED) {
      return res.status(400).json({ message: 'Audit cycle is not in planned status' });
    }

    let queryBuilder = assetRepo.createQueryBuilder('asset');
    
    if (cycle.scopeDepartment) {
      queryBuilder = queryBuilder.where('asset.current_holder_department_id = :deptId', { deptId: cycle.scopeDepartment.id });
    }
    
    if (cycle.scopeLocation) {
      if (cycle.scopeDepartment) {
        queryBuilder = queryBuilder.andWhere('asset.location = :loc', { loc: cycle.scopeLocation });
      } else {
        queryBuilder = queryBuilder.where('asset.location = :loc', { loc: cycle.scopeLocation });
      }
    }

    const assets = await queryBuilder.getMany();

    await AppDataSource.transaction(async (manager) => {
      cycle.status = AuditCycleStatus.IN_PROGRESS;
      await manager.save(cycle);

      for (const asset of assets) {
        const existing = await manager.getRepository(AuditRecord).findOne({
          where: { auditCycle: { id: cycle.id }, asset: { id: asset.id } }
        });
        if (!existing) {
          const record = recordRepo.create({
            auditCycle: cycle,
            asset,
            result: AuditRecordResult.PENDING,
            isDiscrepancy: false
          });
          await manager.save(record);
        }
      }
    });

    await logAudit(
      auth.employeeId,
      'START_AUDIT_CYCLE',
      'AuditCycle',
      id,
      { assetsCount: assets.length }
    );

    return res.json({ message: 'Audit cycle started successfully', cycle: { id: cycle.id, status: cycle.status } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/audit-cycles/:id/assign-auditors', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;
  const { employeeIds } = req.body as { employeeIds?: string[] };

  if (!employeeIds || !Array.isArray(employeeIds)) {
    return res.status(400).json({ message: 'EmployeeIds array is required' });
  }

  try {
    const auditCycleRepo = AppDataSource.getRepository(AuditCycle);
    const employeeRepo = AppDataSource.getRepository(Employee);

    const cycle = await auditCycleRepo.findOne({
      where: { id },
      relations: { auditors: true }
    });

    if (!cycle) {
      return res.status(404).json({ message: 'Audit cycle not found' });
    }

    const auditors = await employeeRepo.find({
      where: { id: In(employeeIds) }
    });

    cycle.auditors = auditors;
    await auditCycleRepo.save(cycle);

    await logAudit(
      auth.employeeId,
      'ASSIGN_AUDITORS',
      'AuditCycle',
      id,
      { auditorsCount: auditors.length }
    );

    return res.json({ message: 'Auditors assigned successfully', cycle: { id: cycle.id, status: cycle.status } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.post('/audit-cycles/:id/close', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const auditCycleRepo = AppDataSource.getRepository(AuditCycle);
    const cycle = await auditCycleRepo.findOne({ where: { id } });

    if (!cycle) {
      return res.status(404).json({ message: 'Audit cycle not found' });
    }

    if (cycle.status !== AuditCycleStatus.IN_PROGRESS) {
      return res.status(400).json({ message: 'Audit cycle is not in progress' });
    }

    cycle.status = AuditCycleStatus.CLOSED;
    cycle.closedAt = new Date();
    cycle.closedBy = { id: auth.employeeId } as Employee;
    await auditCycleRepo.save(cycle);

    await logAudit(
      auth.employeeId,
      'CLOSE_AUDIT_CYCLE',
      'AuditCycle',
      id
    );

    return res.json({ message: 'Audit cycle closed successfully', cycle: { id: cycle.id, status: cycle.status } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.delete('/assets/:id', async (req, res) => {
  const auth = getAuth(req);
  const id = req.params.id;

  try {
    const assetRepo = AppDataSource.getRepository(Asset);
    const asset = await assetRepo.findOne({ where: { id }, withDeleted: true });

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    await AppDataSource.transaction(async (manager) => {
      await deleteAssetCascade(id, manager);
    });

    await logAudit(
      auth.employeeId,
      'DELETE',
      'Asset',
      id,
      { name: asset.name }
    );

    return res.json({ message: 'Asset permanently deleted' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.get('/logs', async (req, res) => {
  try {
    const logRepo = AppDataSource.getRepository(ActivityLog);
    const logs = await logRepo.find({
      relations: { actor: true },
      order: { createdAt: 'DESC' },
      take: 100
    });
    return res.json(logs);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});
