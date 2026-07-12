import { Router, Request, Response } from 'express';
import { In, Not, LessThan, Between } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { Employee, EmployeeRole } from '../entities/Employee';
import { Department } from '../entities/Department';
import { Asset, AssetStatus } from '../entities/Asset';
import { AssetAllocation, AllocationStatus } from '../entities/AssetAllocation';
import { TransferRequest, TransferRequestStatus } from '../entities/TransferRequest';
import { MaintenanceRequest, MaintenanceRequestStatus, MaintenancePriority } from '../entities/MaintenanceRequest';
import { AuditCycle, AuditCycleStatus } from '../entities/AuditCycle';
import { AuditRecord, AuditRecordResult } from '../entities/AuditRecord';
import { ResourceBooking, ResourceBookingStatus } from '../entities/ResourceBooking';
import { BookableResource } from '../entities/BookableResource';
import { Notification, NotificationType } from '../entities/Notification';
import { logAudit } from '../utils/audit';
import { createNotification } from '../utils/notification';

export const departmentRouter = Router();

// Require authenticateToken and role validation
departmentRouter.use(authenticateToken);
departmentRouter.use(requireRole(EmployeeRole.DEPARTMENT_HEAD));

async function getDeptId(employeeId: string): Promise<string> {
  const employeeRepo = AppDataSource.getRepository(Employee);
  const emp = await employeeRepo.findOne({
    where: { id: employeeId },
    relations: { department: true }
  });
  if (!emp || !emp.department) {
    throw new Error('User does not belong to any department');
  }
  return emp.department.id;
}

// 1. Assets API
departmentRouter.get('/assets', async (req, res) => {
  try {
    const deptId = await getDeptId(req.auth!.employeeId);
    const assetRepo = AppDataSource.getRepository(Asset);
    const assets = await assetRepo.find({
      where: [
        { currentHolderDepartment: { id: deptId } },
        { currentHolderEmployee: { department: { id: deptId } } }
      ],
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

// 2. Allocations & Transfers API
departmentRouter.get('/allocations', async (req, res) => {
  try {
    const deptId = await getDeptId(req.auth!.employeeId);
    const allocationRepo = AppDataSource.getRepository(AssetAllocation);
    const allocations = await allocationRepo.find({
      where: [
        { allocatedToDepartment: { id: deptId } },
        { allocatedToEmployee: { department: { id: deptId } } }
      ],
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

departmentRouter.post('/allocations', async (req, res) => {
  const auth = req.auth!;
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
    const deptId = await getDeptId(auth.employeeId);

    if (employeeId) {
      const employeeRepo = AppDataSource.getRepository(Employee);
      const targetEmp = await employeeRepo.findOne({
        where: { id: employeeId },
        relations: { department: true }
      });
      if (!targetEmp) {
        return res.status(400).json({ message: 'Employee not found' });
      }
      if (!targetEmp.department || targetEmp.department.id !== deptId) {
        return res.status(403).json({ message: 'Cannot allocate assets to employees outside your department' });
      }
    }

    if (departmentId) {
      if (departmentId !== deptId) {
        return res.status(403).json({ message: 'Cannot allocate assets to other departments' });
      }
    }

    if (!employeeId && !departmentId) {
      return res.status(400).json({ message: 'Either employeeId or departmentId must be provided' });
    }

    const assetRepo = AppDataSource.getRepository(Asset);
    const asset = await assetRepo.findOne({ where: { id: assetId } });
    if (!asset) {
      return res.status(400).json({ message: 'Asset not found' });
    }

    if (asset.status === AssetStatus.RETIRED || asset.status === AssetStatus.DISPOSED) {
      return res.status(400).json({ message: 'Cannot allocate retired or disposed asset' });
    }

    const employeeRepo = AppDataSource.getRepository(Employee);
    const departmentRepo = AppDataSource.getRepository(Department);
    const allocationRepo = AppDataSource.getRepository(AssetAllocation);

    const employee = employeeId ? await employeeRepo.findOne({ where: { id: employeeId } }) : null;
    const department = departmentId ? await departmentRepo.findOne({ where: { id: departmentId } }) : null;

    const activeAlloc = await allocationRepo.findOne({
      where: { asset: { id: asset.id }, status: AllocationStatus.ACTIVE },
      relations: { allocatedToEmployee: true, allocatedToDepartment: true }
    });
    if (activeAlloc) {
      const holderName = activeAlloc.allocatedToEmployee
        ? activeAlloc.allocatedToEmployee.name
        : activeAlloc.allocatedToDepartment
        ? activeAlloc.allocatedToDepartment.name
        : 'Unknown';
      
      const holderCode = activeAlloc.allocatedToEmployee
        ? activeAlloc.allocatedToEmployee.employeeCode
        : activeAlloc.allocatedToDepartment
        ? activeAlloc.allocatedToDepartment.code
        : '';

      return res.status(400).json({
        message: `Asset is already allocated to ${holderName}${holderCode ? ` (${holderCode})` : ''}`,
        conflict: true,
        currentHolder: `${holderName}${holderCode ? ` (${holderCode})` : ''}`,
        currentAllocationId: activeAlloc.id,
        asset: { id: asset.id, name: asset.name, assetTag: asset.assetTag }
      });
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

    // Notify employee of allocation
    if (employee) {
      await createNotification(
        employee.id,
        NotificationType.ASSET_ASSIGNED,
        'Asset Allocated to You',
        `Asset ${asset.name} (${asset.assetTag}) has been allocated to you by ${auth.name}.`,
        'Asset',
        asset.id
      );
    }

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

departmentRouter.post('/transfers', async (req, res) => {
  const auth = req.auth!;
  const { assetId, requestedToEmployeeId, requestedToDepartmentId, reason } = req.body as {
    assetId: string;
    requestedToEmployeeId?: string;
    requestedToDepartmentId?: string;
    reason?: string;
  };

  if (!assetId) {
    return res.status(400).json({ message: 'AssetId is required' });
  }

  try {
    const deptId = await getDeptId(auth.employeeId);
    const assetRepo = AppDataSource.getRepository(Asset);
    const asset = await assetRepo.findOne({ where: { id: assetId } });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const allocationRepo = AppDataSource.getRepository(AssetAllocation);
    const currentAllocation = await allocationRepo.findOne({
      where: { asset: { id: assetId }, status: AllocationStatus.ACTIVE },
      relations: { allocatedToEmployee: { department: true }, allocatedToDepartment: true }
    });

    if (!currentAllocation) {
      return res.status(400).json({ message: 'Asset is not currently allocated to anyone' });
    }

    const employeeRepo = AppDataSource.getRepository(Employee);
    const departmentRepo = AppDataSource.getRepository(Department);

    let requestedToEmployee: Employee | null = null;
    if (requestedToEmployeeId) {
      requestedToEmployee = await employeeRepo.findOne({ where: { id: requestedToEmployeeId }, relations: { department: true } });
      if (!requestedToEmployee || !requestedToEmployee.department || requestedToEmployee.department.id !== deptId) {
        return res.status(403).json({ message: 'Cannot request transfer to employees outside your department' });
      }
    }

    let requestedToDepartment: Department | null = null;
    if (requestedToDepartmentId) {
      requestedToDepartment = await departmentRepo.findOne({ where: { id: requestedToDepartmentId } });
      if (!requestedToDepartment || requestedToDepartment.id !== deptId) {
        return res.status(403).json({ message: 'Cannot request transfer to other departments' });
      }
    }

    if (!requestedToEmployee && !requestedToDepartment) {
      return res.status(400).json({ message: 'Either requestedToEmployeeId or requestedToDepartmentId must be provided' });
    }

    const transferRepo = AppDataSource.getRepository(TransferRequest);
    const transfer = transferRepo.create({
      asset,
      currentAllocation,
      requestedBy: { id: auth.employeeId } as Employee,
      requestedToEmployee: requestedToEmployee || undefined,
      requestedToDepartment: requestedToDepartment || undefined,
      reason,
      status: TransferRequestStatus.REQUESTED
    });

    await transferRepo.save(transfer);

    if (currentAllocation.allocatedToEmployee) {
      await createNotification(
        currentAllocation.allocatedToEmployee.id,
        NotificationType.TRANSFER_APPROVED,
        'Transfer Requested',
        `A transfer request has been initiated for asset ${asset.name} (${asset.assetTag}) currently allocated to you.`,
        'TransferRequest',
        transfer.id
      );
    }

    await logAudit(auth.employeeId, 'CREATE_TRANSFER_REQUEST', 'TransferRequest', transfer.id, { assetId });
    return res.status(201).json(transfer);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

departmentRouter.get('/transfers', async (req, res) => {
  try {
    const deptId = await getDeptId(req.auth!.employeeId);
    const transferRepo = AppDataSource.getRepository(TransferRequest);
    const transfers = await transferRepo.find({
      relations: {
        asset: true,
        currentAllocation: { allocatedToEmployee: { department: true }, allocatedToDepartment: true },
        requestedBy: { department: true },
        requestedToEmployee: { department: true },
        requestedToDepartment: true,
        approvedBy: true
      }
    });

    const filteredTransfers = transfers.filter(t => {
      const srcDeptId = t.currentAllocation?.allocatedToDepartment?.id || t.currentAllocation?.allocatedToEmployee?.department?.id || t.requestedBy?.department?.id;
      const destDeptId = t.requestedToDepartment?.id || t.requestedToEmployee?.department?.id;
      return srcDeptId === deptId || destDeptId === deptId;
    });

    return res.json(filteredTransfers);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

departmentRouter.post('/transfers/:id/approve', async (req, res) => {
  const auth = req.auth!;
  const id = req.params.id;

  try {
    const deptId = await getDeptId(auth.employeeId);
    const transferRepo = AppDataSource.getRepository(TransferRequest);
    const allocationRepo = AppDataSource.getRepository(AssetAllocation);

    const transfer = await transferRepo.findOne({
      where: { id },
      relations: {
        asset: true,
        currentAllocation: { allocatedToEmployee: { department: true }, allocatedToDepartment: true },
        requestedBy: { department: true },
        requestedToEmployee: { department: true },
        requestedToDepartment: true
      }
    });

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    if (transfer.status !== TransferRequestStatus.REQUESTED) {
      return res.status(400).json({ message: 'Transfer request is not in requested status' });
    }

    const srcDeptId = transfer.currentAllocation?.allocatedToDepartment?.id || transfer.currentAllocation?.allocatedToEmployee?.department?.id;
    const destDeptId = transfer.requestedToDepartment?.id || transfer.requestedToEmployee?.department?.id;

    if (srcDeptId !== deptId || destDeptId !== deptId) {
      return res.status(403).json({ message: 'Department Head can only approve transfers where both source and destination belong to their department' });
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

    return res.json({ message: 'Transfer request approved successfully', transfer: { id: transfer.id, status: transfer.status } });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

departmentRouter.post('/transfers/:id/reject', async (req, res) => {
  const auth = req.auth!;
  const id = req.params.id;
  const { reason } = req.body as { reason?: string };

  try {
    const deptId = await getDeptId(auth.employeeId);
    const transferRepo = AppDataSource.getRepository(TransferRequest);

    const transfer = await transferRepo.findOne({
      where: { id },
      relations: {
        asset: true,
        currentAllocation: { allocatedToEmployee: { department: true }, allocatedToDepartment: true },
        requestedToEmployee: { department: true },
        requestedToDepartment: true
      }
    });

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    if (transfer.status !== TransferRequestStatus.REQUESTED) {
      return res.status(400).json({ message: 'Transfer request is not in requested status' });
    }

    const srcDeptId = transfer.currentAllocation?.allocatedToDepartment?.id || transfer.currentAllocation?.allocatedToEmployee?.department?.id;
    const destDeptId = transfer.requestedToDepartment?.id || transfer.requestedToEmployee?.department?.id;

    if (srcDeptId !== deptId || destDeptId !== deptId) {
      return res.status(403).json({ message: 'Department Head can only reject transfers where both source and destination belong to their department' });
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

// 3. Maintenance API
departmentRouter.get('/maintenance-requests', async (req, res) => {
  try {
    const deptId = await getDeptId(req.auth!.employeeId);
    const mrRepo = AppDataSource.getRepository(MaintenanceRequest);
    const requests = await mrRepo.find({
      relations: {
        asset: true,
        raisedBy: { department: true },
        approvedOrRejectedBy: true
      }
    });

    const filtered = requests.filter(r => {
      const raisedByDept = r.raisedBy?.department?.id;
      const assetDept = r.asset?.currentHolderDepartment?.id;
      return raisedByDept === deptId || assetDept === deptId;
    });

    return res.json(filtered);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

departmentRouter.post('/maintenance-requests', async (req, res) => {
  const auth = req.auth!;
  const { assetId, issueDescription, priority } = req.body as {
    assetId: string;
    issueDescription: string;
    priority?: string;
  };

  if (!assetId || !issueDescription) {
    return res.status(400).json({ message: 'AssetId and issueDescription are required' });
  }

  try {
    const deptId = await getDeptId(auth.employeeId);
    const assetRepo = AppDataSource.getRepository(Asset);
    const asset = await assetRepo.findOne({ where: { id: assetId } });

    if (!asset) {
      return res.status(400).json({ message: 'Asset not found' });
    }

    const mrRepo = AppDataSource.getRepository(MaintenanceRequest);
    const request = mrRepo.create({
      asset,
      raisedBy: { id: auth.employeeId } as Employee,
      issueDescription,
      priority: (priority as MaintenancePriority) || MaintenancePriority.MEDIUM,
      status: MaintenanceRequestStatus.PENDING
    });

    await mrRepo.save(request);

    await logAudit(
      auth.employeeId,
      'RAISE_MAINTENANCE',
      'MaintenanceRequest',
      request.id,
      { assetId }
    );

    return res.status(201).json(request);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// 4. Audits API
departmentRouter.get('/audit-cycles', async (req, res) => {
  try {
    const deptId = await getDeptId(req.auth!.employeeId);
    const auditCycleRepo = AppDataSource.getRepository(AuditCycle);
    const cycles = await auditCycleRepo.find({
      relations: {
        scopeDepartment: true,
        createdBy: true,
        closedBy: true,
        auditors: true
      }
    });

    const filtered = cycles.filter(c => {
      const isAuditor = c.auditors?.some(a => a.id === req.auth!.employeeId);
      const isDeptScope = c.scopeDepartment?.id === deptId;
      return isAuditor || isDeptScope;
    });

    return res.json(filtered);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

departmentRouter.get('/audit-cycles/:id/records', async (req, res) => {
  const auth = req.auth!;
  const cycleId = req.params.id;

  try {
    const deptId = await getDeptId(auth.employeeId);
    const recordRepo = AppDataSource.getRepository(AuditRecord);
    const records = await recordRepo.find({
      where: { auditCycle: { id: cycleId } },
      relations: {
        asset: { currentHolderDepartment: true, currentHolderEmployee: true },
        auditCycle: { auditors: true },
        verifiedByAuditor: true
      }
    });

    if (records.length > 0) {
      const cycle = records[0].auditCycle;
      const isAuditor = cycle.auditors?.some(a => a.id === auth.employeeId);
      const isDeptScope = cycle.scopeDepartment?.id === deptId;
      if (!isAuditor && !isDeptScope) {
        return res.status(403).json({ message: 'Not authorized to view records for this audit cycle' });
      }
    }

    return res.json(records);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

departmentRouter.post('/audit-records/:id/submit', async (req, res) => {
  const auth = req.auth!;
  const recordId = req.params.id;
  const { result, notes } = req.body as { result?: AuditRecordResult; notes?: string };

  if (!result || ![AuditRecordResult.VERIFIED, AuditRecordResult.MISSING, AuditRecordResult.DAMAGED].includes(result)) {
    return res.status(400).json({ message: 'Valid result (verified, missing, damaged) is required' });
  }

  try {
    const recordRepo = AppDataSource.getRepository(AuditRecord);
    const record = await recordRepo.findOne({
      where: { id: recordId },
      relations: { auditCycle: { auditors: true }, asset: true }
    });

    if (!record) {
      return res.status(404).json({ message: 'Audit record not found' });
    }

    if (record.auditCycle.status !== AuditCycleStatus.IN_PROGRESS) {
      return res.status(400).json({ message: 'Audit cycle is not in progress' });
    }

    const isAuditor = record.auditCycle.auditors.some(auditor => auditor.id === auth.employeeId);
    if (!isAuditor) {
      return res.status(403).json({ message: 'You are not assigned as an auditor for this audit cycle' });
    }

    record.result = result;
    record.notes = notes || record.notes;
    record.verifiedByAuditor = { id: auth.employeeId } as Employee;
    record.verifiedAt = new Date();
    record.isDiscrepancy = result === AuditRecordResult.MISSING || result === AuditRecordResult.DAMAGED;

    await recordRepo.save(record);

    await logAudit(
      auth.employeeId,
      'SUBMIT_AUDIT_RESULT',
      'AuditRecord',
      record.id,
      { result, assetId: record.asset.id }
    );

    return res.json({ message: 'Audit result submitted successfully', record });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// 5. Bookings API
departmentRouter.get('/bookings', async (req, res) => {
  try {
    const deptId = await getDeptId(req.auth!.employeeId);
    const bookingRepo = AppDataSource.getRepository(ResourceBooking);
    const bookings = await bookingRepo.find({
      where: [
        { bookedForDepartment: { id: deptId } },
        { bookedBy: { id: req.auth!.employeeId } }
      ],
      relations: {
        resource: true,
        bookedBy: true,
        bookedForDepartment: true
      }
    });

    // Dynamically calculate status based on current time
    const now = new Date();
    for (const bk of bookings) {
      if (bk.status !== ResourceBookingStatus.CANCELLED) {
        if (now > bk.endTime) {
          bk.status = ResourceBookingStatus.COMPLETED;
        } else if (now >= bk.startTime) {
          bk.status = ResourceBookingStatus.ONGOING;
        }
      }
    }

    return res.json(bookings);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

departmentRouter.post('/bookings', async (req, res) => {
  const auth = req.auth!;
  const { resourceId, startTime, endTime, departmentId } = req.body as {
    resourceId: string;
    startTime: string;
    endTime: string;
    departmentId?: string;
  };

  if (!resourceId || !startTime || !endTime) {
    return res.status(400).json({ message: 'ResourceId, startTime, and endTime are required' });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return res.status(400).json({ message: 'Invalid start or end time' });
  }

  try {
    const deptId = await getDeptId(auth.employeeId);

    if (departmentId && departmentId !== deptId) {
      return res.status(403).json({ message: 'Cannot create bookings on behalf of other departments' });
    }

    const resourceRepo = AppDataSource.getRepository(BookableResource);
    const resource = await resourceRepo.findOne({ where: { id: resourceId } });
    if (!resource) {
      return res.status(400).json({ message: 'Bookable resource not found' });
    }

    const bookingRepo = AppDataSource.getRepository(ResourceBooking);

    // Overlap check
    const overlap = await bookingRepo.createQueryBuilder('booking')
      .where('booking.resource_id = :resourceId', { resourceId })
      .andWhere('booking.status != :cancelled', { cancelled: ResourceBookingStatus.CANCELLED })
      .andWhere('booking.start_time < :end', { end })
      .andWhere('booking.end_time > :start', { start })
      .getOne();

    if (overlap) {
      return res.status(400).json({ message: 'Overlapping booking exists for this resource' });
    }

    const booking = bookingRepo.create({
      resource,
      startTime: start,
      endTime: end,
      bookedBy: { id: auth.employeeId } as Employee,
      bookedForDepartment: departmentId ? { id: departmentId } as Department : { id: deptId } as Department,
      status: ResourceBookingStatus.UPCOMING
    });

    await bookingRepo.save(booking);

    // Send confirmation notification
    await createNotification(
      booking.bookedBy.id,
      NotificationType.BOOKING_CONFIRMED,
      'Booking Confirmed',
      `Booking for resource ${resource.name} has been confirmed for ${start.toLocaleString()} to ${end.toLocaleString()}.`,
      'ResourceBooking',
      booking.id
    );

    await logAudit(
      auth.employeeId,
      'CREATE_BOOKING',
      'ResourceBooking',
      booking.id,
      { resourceId }
    );

    return res.status(201).json(booking);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

departmentRouter.post('/bookings/:id/cancel', async (req, res) => {
  const auth = req.auth!;
  const id = req.params.id;

  try {
    const deptId = await getDeptId(auth.employeeId);
    const bookingRepo = AppDataSource.getRepository(ResourceBooking);
    const booking = await bookingRepo.findOne({
      where: { id },
      relations: { bookedBy: true, bookedForDepartment: true, resource: true }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isOwner = booking.bookedBy?.id === auth.employeeId;
    const isDeptMatch = booking.bookedForDepartment?.id === deptId;

    if (!isOwner && !isDeptMatch) {
      return res.status(403).json({ message: 'Cannot cancel bookings belonging to another department' });
    }

    booking.status = ResourceBookingStatus.CANCELLED;
    await bookingRepo.save(booking);

    // Notify employee of cancellation
    await createNotification(
      booking.bookedBy.id,
      NotificationType.BOOKING_CANCELLED,
      'Booking Cancelled',
      `Your booking for resource ${booking.resource.name} has been cancelled by department head.`,
      'ResourceBooking',
      booking.id
    );

    await logAudit(
      auth.employeeId,
      'CANCEL_BOOKING',
      'ResourceBooking',
      booking.id
    );

    return res.json({ message: 'Booking cancelled successfully', booking });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

departmentRouter.put('/bookings/:id', async (req, res) => {
  const auth = req.auth!;
  const id = req.params.id;
  const { startTime, endTime } = req.body as { startTime?: string; endTime?: string };

  try {
    const deptId = await getDeptId(auth.employeeId);
    const bookingRepo = AppDataSource.getRepository(ResourceBooking);
    const booking = await bookingRepo.findOne({
      where: { id },
      relations: { bookedBy: true, bookedForDepartment: true, resource: true }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isOwner = booking.bookedBy?.id === auth.employeeId;
    const isDeptMatch = booking.bookedForDepartment?.id === deptId;

    if (!isOwner && !isDeptMatch) {
      return res.status(403).json({ message: 'Cannot reschedule bookings belonging to another department' });
    }

    const start = startTime ? new Date(startTime) : booking.startTime;
    const end = endTime ? new Date(endTime) : booking.endTime;

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return res.status(400).json({ message: 'Invalid start or end time' });
    }

    // Overlap check
    if (startTime || endTime) {
      const overlap = await bookingRepo.createQueryBuilder('booking')
        .where('booking.resource_id = :resourceId', { resourceId: booking.resource.id })
        .andWhere('booking.status != :cancelled', { cancelled: ResourceBookingStatus.CANCELLED })
        .andWhere('booking.start_time < :end', { end })
        .andWhere('booking.end_time > :start', { start })
        .andWhere('booking.id != :bookingId', { bookingId: id })
        .getOne();

      if (overlap) {
        return res.status(400).json({ message: 'Overlapping booking exists for this resource' });
      }
    }

    if (startTime) booking.startTime = start;
    if (endTime) booking.endTime = end;
    await bookingRepo.save(booking);

    await logAudit(
      auth.employeeId,
      'RESCHEDULE_BOOKING',
      'ResourceBooking',
      booking.id
    );

    return res.json({ message: 'Booking rescheduled successfully', booking });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

departmentRouter.get('/employees', async (req, res) => {
  try {
    const deptId = await getDeptId(req.auth!.employeeId);
    const employeeRepo = AppDataSource.getRepository(Employee);
    const employees = await employeeRepo.find({
      where: { department: { id: deptId } },
      relations: { department: true }
    });
    return res.json(employees);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

departmentRouter.get('/bookable-resources', async (req, res) => {
  try {
    const resourceRepo = AppDataSource.getRepository(BookableResource);
    const resources = await resourceRepo.find({
      relations: { linkedAsset: true }
    });
    return res.json(resources);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});
