import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { Employee, EmployeeRole } from '../entities/Employee';
import { Asset } from '../entities/Asset';
import { AssetAllocation, AllocationStatus } from '../entities/AssetAllocation';
import { TransferRequest, TransferRequestStatus } from '../entities/TransferRequest';
import { MaintenanceRequest, MaintenanceRequestStatus } from '../entities/MaintenanceRequest';
import { ResourceBooking, ResourceBookingStatus } from '../entities/ResourceBooking';
import { Notification } from '../entities/Notification';
import { AppDataSource } from '../config/data-source';

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

dashboardRouter.get('/department-head', authenticateToken, requireRole(EmployeeRole.DEPARTMENT_HEAD), async (req, res) => {
  try {
    const employeeRepo = AppDataSource.getRepository(Employee);
    const emp = await employeeRepo.findOne({
      where: { id: req.auth!.employeeId },
      relations: { department: true }
    });

    if (!emp || !emp.department) {
      return res.status(403).json({ message: 'User does not belong to any department' });
    }

    const deptId = emp.department.id;

    // Assets count
    const assetRepo = AppDataSource.getRepository(Asset);
    const assetsCount = await assetRepo.count({
      where: [
        { currentHolderDepartment: { id: deptId } },
        { currentHolderEmployee: { department: { id: deptId } } }
      ]
    });

    // Active allocations
    const allocationRepo = AppDataSource.getRepository(AssetAllocation);
    const allocationsCount = await allocationRepo.count({
      where: [
        { allocatedToDepartment: { id: deptId }, status: AllocationStatus.ACTIVE },
        { allocatedToEmployee: { department: { id: deptId } }, status: AllocationStatus.ACTIVE }
      ]
    });

    // Pending transfers (requested transfers involving department as source or destination)
    const transferRepo = AppDataSource.getRepository(TransferRequest);
    const transfers = await transferRepo.find({
      where: { status: TransferRequestStatus.REQUESTED },
      relations: {
        currentAllocation: { allocatedToEmployee: { department: true }, allocatedToDepartment: true },
        requestedBy: { department: true },
        requestedToEmployee: { department: true },
        requestedToDepartment: true
      }
    });

    const pendingTransfersCount = transfers.filter(t => {
      const srcDeptId = t.currentAllocation?.allocatedToDepartment?.id || t.currentAllocation?.allocatedToEmployee?.department?.id || t.requestedBy?.department?.id;
      const destDeptId = t.requestedToDepartment?.id || t.requestedToEmployee?.department?.id;
      return srcDeptId === deptId || destDeptId === deptId;
    }).length;

    // Pending maintenance requests (pending status raised by employees or on assets of department)
    const mrRepo = AppDataSource.getRepository(MaintenanceRequest);
    const maintenance = await mrRepo.find({
      where: { status: MaintenanceRequestStatus.PENDING },
      relations: {
        asset: { currentHolderDepartment: true },
        raisedBy: { department: true }
      }
    });

    const pendingMaintenanceCount = maintenance.filter(r => {
      const raisedByDept = r.raisedBy?.department?.id;
      const assetDept = r.asset?.currentHolderDepartment?.id;
      return raisedByDept === deptId || assetDept === deptId;
    }).length;

    return res.json({
      dashboard: 'department-head',
      title: 'Department Head Dashboard',
      user: req.auth,
      department: emp.department.name,
      kpis: {
        assetsCount,
        allocationsCount,
        pendingTransfersCount,
        pendingMaintenanceCount
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

dashboardRouter.get('/employee', authenticateToken, requireRole(EmployeeRole.EMPLOYEE), async (req, res) => {
  try {
    const auth = req.auth!;
    const assetRepo = AppDataSource.getRepository(Asset);
    const bookingRepo = AppDataSource.getRepository(ResourceBooking);
    const mrRepo = AppDataSource.getRepository(MaintenanceRequest);
    const notifRepo = AppDataSource.getRepository(Notification);

    const assetsCount = await assetRepo.count({
      where: { currentHolderEmployee: { id: auth.employeeId } }
    });

    const bookingsCount = await bookingRepo.count({
      where: { bookedBy: { id: auth.employeeId }, status: ResourceBookingStatus.UPCOMING }
    });

    const pendingMaintenanceCount = await mrRepo.count({
      where: { raisedBy: { id: auth.employeeId }, status: MaintenanceRequestStatus.PENDING }
    });

    const unreadNotificationsCount = await notifRepo.count({
      where: { recipient: { id: auth.employeeId }, isRead: false }
    });

    return res.json({
      dashboard: 'employee',
      title: 'Employee Dashboard',
      user: req.auth,
      kpis: {
        assetsCount,
        bookingsCount,
        pendingMaintenanceCount,
        unreadNotificationsCount
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});