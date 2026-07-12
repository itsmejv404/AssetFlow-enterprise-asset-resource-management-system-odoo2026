import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/data-source';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { Employee, EmployeeRole } from '../entities/Employee';
import { Asset, AssetStatus } from '../entities/Asset';
import { AssetAllocation, AllocationStatus } from '../entities/AssetAllocation';
import { TransferRequest, TransferRequestStatus } from '../entities/TransferRequest';
import { ResourceBooking, ResourceBookingStatus } from '../entities/ResourceBooking';
import { BookableResource } from '../entities/BookableResource';
import { MaintenanceRequest, MaintenanceRequestStatus, MaintenancePriority } from '../entities/MaintenanceRequest';
import { AuditCycle, AuditCycleStatus } from '../entities/AuditCycle';
import { AuditRecord, AuditRecordResult } from '../entities/AuditRecord';
import { Notification } from '../entities/Notification';
import { logAudit } from '../utils/audit';

export const employeeRouter = Router();

// Enforce baseline authentication for any employee action
employeeRouter.use(authenticateToken);

const getAuth = (req: Request) => {
  if (!req.auth) throw new Error('Unauthorized');
  return req.auth;
};

// 1. Asset Access
employeeRouter.get('/assets', async (req, res) => {
  try {
    const assetRepo = AppDataSource.getRepository(Asset);
    const assets = await assetRepo.find({
      relations: {
        category: true,
        currentHolderEmployee: true,
        currentHolderDepartment: true
      }
    });
    return res.json(assets);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

employeeRouter.get('/assets/:id', async (req, res) => {
  try {
    const assetRepo = AppDataSource.getRepository(Asset);
    const asset = await assetRepo.findOne({
      where: { id: req.params.id },
      relations: {
        category: true,
        currentHolderEmployee: true,
        currentHolderDepartment: true
      }
    });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    return res.json(asset);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

employeeRouter.get('/assets/:id/history', async (req, res) => {
  try {
    const allocationRepo = AppDataSource.getRepository(AssetAllocation);
    const maintenanceRepo = AppDataSource.getRepository(MaintenanceRequest);

    const allocations = await allocationRepo.find({
      where: { asset: { id: req.params.id } },
      relations: { allocatedToEmployee: true, allocatedToDepartment: true },
      order: { allocatedDate: 'DESC' }
    });

    const maintenance = await maintenanceRepo.find({
      where: { asset: { id: req.params.id } },
      relations: { raisedBy: true },
      order: { createdAt: 'DESC' }
    });

    return res.json({ allocations, maintenance });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// 2. Self Allocations
employeeRouter.get('/my/assets', async (req, res) => {
  const auth = getAuth(req);
  try {
    const assetRepo = AppDataSource.getRepository(Asset);
    const assets = await assetRepo.find({
      where: { currentHolderEmployee: { id: auth.employeeId } },
      relations: { category: true }
    });
    return res.json(assets);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// 3. Asset Transfer
employeeRouter.get('/my/transfers', async (req, res) => {
  const auth = getAuth(req);
  try {
    const transferRepo = AppDataSource.getRepository(TransferRequest);
    const transfers = await transferRepo.find({
      where: [
        { requestedBy: { id: auth.employeeId } },
        { currentAllocation: { allocatedToEmployee: { id: auth.employeeId } } }
      ],
      relations: {
        asset: true,
        currentAllocation: { allocatedToEmployee: true },
        requestedBy: true,
        requestedToEmployee: true
      }
    });
    return res.json(transfers);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

employeeRouter.post('/transfers', async (req, res) => {
  const auth = getAuth(req);
  const { assetId, reason } = req.body as { assetId: string; reason?: string };

  try {
    const assetRepo = AppDataSource.getRepository(Asset);
    const asset = await assetRepo.findOne({
      where: { id: assetId },
      relations: { currentHolderEmployee: true }
    });

    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    // Fetch the active allocation for this asset
    const allocationRepo = AppDataSource.getRepository(AssetAllocation);
    const currentAllocation = await allocationRepo.findOne({
      where: { asset: { id: assetId }, status: AllocationStatus.ACTIVE },
      relations: { allocatedToEmployee: true }
    });

    if (!currentAllocation) {
      return res.status(400).json({ message: 'Asset is not currently allocated to anyone' });
    }

    const transferRepo = AppDataSource.getRepository(TransferRequest);
    const transfer = transferRepo.create({
      asset,
      currentAllocation,
      requestedBy: { id: auth.employeeId } as Employee,
      requestedToEmployee: { id: auth.employeeId } as Employee, // self transfer request
      reason,
      status: TransferRequestStatus.REQUESTED
    });

    await transferRepo.save(transfer);

    await logAudit(auth.employeeId, 'CREATE_TRANSFER_REQUEST', 'TransferRequest', transfer.id, { assetId });
    return res.status(201).json(transfer);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

employeeRouter.get('/bookable-resources', async (req, res) => {
  try {
    const resourceRepo = AppDataSource.getRepository(BookableResource);
    const resources = await resourceRepo.find({
      where: { isActive: true },
      relations: { linkedAsset: true }
    });
    return res.json(resources);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// 4. Resource Booking (Self Only)
employeeRouter.get('/my/bookings', async (req, res) => {
  const auth = getAuth(req);
  try {
    const bookingRepo = AppDataSource.getRepository(ResourceBooking);
    const bookings = await bookingRepo.find({
      where: { bookedBy: { id: auth.employeeId } },
      relations: { resource: { linkedAsset: true } }
    });
    return res.json(bookings);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

employeeRouter.post('/bookings', async (req, res) => {
  const auth = getAuth(req);
  const { resourceId, startTime, endTime } = req.body as { resourceId: string; startTime: string; endTime: string };

  try {
    const resourceRepo = AppDataSource.getRepository(BookableResource);
    const resource = await resourceRepo.findOne({ where: { id: resourceId } });
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    const bookingRepo = AppDataSource.getRepository(ResourceBooking);
    const booking = bookingRepo.create({
      resource,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      bookedBy: { id: auth.employeeId } as Employee,
      status: ResourceBookingStatus.UPCOMING
    });

    await bookingRepo.save(booking);

    await logAudit(auth.employeeId, 'CREATE_BOOKING', 'ResourceBooking', booking.id, { resourceId });
    return res.status(201).json(booking);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

employeeRouter.post('/bookings/:id/cancel', async (req, res) => {
  const auth = getAuth(req);
  try {
    const bookingRepo = AppDataSource.getRepository(ResourceBooking);
    const booking = await bookingRepo.findOne({
      where: { id: req.params.id, bookedBy: { id: auth.employeeId } }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found or not owned by you' });

    booking.status = ResourceBookingStatus.CANCELLED;
    await bookingRepo.save(booking);

    await logAudit(auth.employeeId, 'CANCEL_BOOKING', 'ResourceBooking', booking.id);
    return res.json(booking);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

employeeRouter.put('/bookings/:id', async (req, res) => {
  const auth = getAuth(req);
  const { startTime, endTime } = req.body as { startTime?: string; endTime?: string };

  try {
    const bookingRepo = AppDataSource.getRepository(ResourceBooking);
    const booking = await bookingRepo.findOne({
      where: { id: req.params.id, bookedBy: { id: auth.employeeId } }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found or not owned by you' });

    if (startTime) booking.startTime = new Date(startTime);
    if (endTime) booking.endTime = new Date(endTime);

    await bookingRepo.save(booking);

    await logAudit(auth.employeeId, 'UPDATE_BOOKING', 'ResourceBooking', booking.id);
    return res.json(booking);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// 5. Maintenance Requests (Self Only, restricted to allocated assets)
employeeRouter.get('/my/maintenance-requests', async (req, res) => {
  const auth = getAuth(req);
  try {
    const mrRepo = AppDataSource.getRepository(MaintenanceRequest);
    const requests = await mrRepo.find({
      where: { raisedBy: { id: auth.employeeId } },
      relations: { asset: true }
    });
    return res.json(requests);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

employeeRouter.post('/maintenance-requests', async (req, res) => {
  const auth = getAuth(req);
  const { assetId, issueDescription, priority } = req.body as { assetId: string; issueDescription: string; priority?: string };

  try {
    const assetRepo = AppDataSource.getRepository(Asset);
    const asset = await assetRepo.findOne({
      where: { id: assetId, currentHolderEmployee: { id: auth.employeeId } }
    });

    if (!asset) {
      return res.status(400).json({ message: 'Asset is not allocated to you, or not found' });
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

    await logAudit(auth.employeeId, 'RAISE_MAINTENANCE', 'MaintenanceRequest', request.id, { assetId });
    return res.status(201).json(request);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// 6. Audit Cycles Participation
employeeRouter.get('/my/audit-cycles', async (req, res) => {
  const auth = getAuth(req);
  try {
    const cycleRepo = AppDataSource.getRepository(AuditCycle);
    const cycles = await cycleRepo.find({
      where: { auditors: { id: auth.employeeId }, status: AuditCycleStatus.IN_PROGRESS },
      relations: { scopeDepartment: true }
    });
    return res.json(cycles);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

employeeRouter.get('/my/audit-cycles/:cycleId/records', async (req, res) => {
  const auth = getAuth(req);
  const { cycleId } = req.params;

  try {
    const cycleRepo = AppDataSource.getRepository(AuditCycle);
    const cycle = await cycleRepo.findOne({
      where: { id: cycleId, auditors: { id: auth.employeeId } }
    });

    if (!cycle) {
      return res.status(403).json({ message: 'Access denied: You are not assigned to this cycle' });
    }

    const recordRepo = AppDataSource.getRepository(AuditRecord);
    const records = await recordRepo.find({
      where: { auditCycle: { id: cycleId } },
      relations: { asset: true }
    });
    return res.json(records);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

employeeRouter.post('/audit-records/:id/submit', async (req, res) => {
  const auth = getAuth(req);
  const { id } = req.params;
  const { result, notes } = req.body as { result: string; notes?: string };

  try {
    const recordRepo = AppDataSource.getRepository(AuditRecord);
    const record = await recordRepo.findOne({
      where: { id },
      relations: { auditCycle: { auditors: true } }
    });

    if (!record) return res.status(404).json({ message: 'Audit record not found' });

    // Validate if employee is assigned auditor
    const isAssigned = record.auditCycle.auditors.some(aud => aud.id === auth.employeeId);
    if (!isAssigned) {
      return res.status(403).json({ message: 'Access denied: You are not an assigned auditor' });
    }

    record.result = result as AuditRecordResult;
    record.notes = notes || null;
    record.verifiedAt = new Date();
    await recordRepo.save(record);

    await logAudit(auth.employeeId, 'SUBMIT_AUDIT_RECORD', 'AuditRecord', id, { result });
    return res.json(record);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// 7. Notifications
employeeRouter.get('/my/notifications', async (req, res) => {
  const auth = getAuth(req);
  try {
    const notifRepo = AppDataSource.getRepository(Notification);
    const notifications = await notifRepo.find({
      where: { recipient: { id: auth.employeeId } },
      order: { createdAt: 'DESC' }
    });
    return res.json(notifications);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

employeeRouter.post('/my/notifications/:id/read', async (req, res) => {
  const auth = getAuth(req);
  try {
    const notifRepo = AppDataSource.getRepository(Notification);
    const notification = await notifRepo.findOne({
      where: { id: req.params.id, recipient: { id: auth.employeeId } }
    });

    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    notification.isRead = true;
    await notifRepo.save(notification);
    return res.json(notification);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});
