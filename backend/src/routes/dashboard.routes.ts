import { Router } from 'express';
import { In, LessThan, Between } from 'typeorm';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { Employee, EmployeeRole } from '../entities/Employee';
import { Asset, AssetStatus } from '../entities/Asset';
import { AssetAllocation, AllocationStatus } from '../entities/AssetAllocation';
import { TransferRequest, TransferRequestStatus } from '../entities/TransferRequest';
import { MaintenanceRequest, MaintenanceRequestStatus } from '../entities/MaintenanceRequest';
import { ResourceBooking, ResourceBookingStatus } from '../entities/ResourceBooking';
import { Notification } from '../entities/Notification';
import { AppDataSource } from '../config/data-source';

export const dashboardRouter = Router();

async function getAdminManagerDashboardData(req: any) {
  const assetRepo = AppDataSource.getRepository(Asset);
  const allocationRepo = AppDataSource.getRepository(AssetAllocation);
  const bookingRepo = AppDataSource.getRepository(ResourceBooking);
  const mrRepo = AppDataSource.getRepository(MaintenanceRequest);
  const transferRepo = AppDataSource.getRepository(TransferRequest);

  const now = new Date();

  // 1. Total Assets Available
  const totalAssetsAvailable = await assetRepo.count({ where: { status: AssetStatus.AVAILABLE } });

  // 2. Assets Allocated
  const assetsAllocated = await assetRepo.count({ where: { status: AssetStatus.ALLOCATED } });

  // 3. Maintenance Due Today (Unresolved maintenance requests)
  const maintenanceDueToday = await mrRepo.count({
    where: {
      status: In([
        MaintenanceRequestStatus.PENDING,
        MaintenanceRequestStatus.APPROVED,
        MaintenanceRequestStatus.TECHNICIAN_ASSIGNED,
        MaintenanceRequestStatus.IN_PROGRESS
      ])
    }
  });

  // 4. Active Bookings
  const activeBookings = await bookingRepo.count({
    where: {
      status: In([ResourceBookingStatus.UPCOMING, ResourceBookingStatus.ONGOING])
    }
  });

  // 5. Pending Transfers
  const pendingTransfers = await transferRepo.count({ where: { status: TransferRequestStatus.REQUESTED } });

  // 6. Upcoming Returns
  const upcomingReturns = await allocationRepo.count({
    where: {
      status: AllocationStatus.ACTIVE,
      expectedReturnDate: Between(now, new Date(Date.now() + 1000 * 60 * 60 * 24 * 30))
    }
  });

  // 7. Overdue returns
  const overdueReturnsList = await allocationRepo.find({
    where: {
      status: AllocationStatus.ACTIVE,
      expectedReturnDate: LessThan(now)
    },
    relations: {
      asset: true,
      allocatedToEmployee: true,
      allocatedToDepartment: true
    }
  });

  // 8. Upcoming return alerts (next 3 days)
  const threeDaysFromNow = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
  const upcomingReturnAlerts = await allocationRepo.find({
    where: {
      status: AllocationStatus.ACTIVE,
      expectedReturnDate: Between(now, threeDaysFromNow)
    },
    relations: {
      asset: true,
      allocatedToEmployee: true,
      allocatedToDepartment: true
    }
  });

  // 9. Maintenance activity summary (recent 5 requests)
  const maintenanceSummary = await mrRepo.find({
    relations: { asset: true, raisedBy: true },
    order: { createdAt: 'DESC' },
    take: 5
  });

  // 10. Booking activity summary (recent 5 bookings)
  const bookingSummary = await bookingRepo.find({
    relations: { resource: { linkedAsset: true }, bookedBy: true },
    order: { createdAt: 'DESC' },
    take: 5
  });

  return {
    title: 'Operational Dashboard',
    user: req.auth,
    kpis: {
      totalAssetsAvailable,
      assetsAllocated,
      maintenanceDueToday,
      activeBookings,
      pendingTransfers,
      upcomingReturns,
      overdueReturnsCount: overdueReturnsList.length
    },
    overdueReturns: overdueReturnsList,
    upcomingReturnAlerts,
    maintenanceSummary,
    bookingSummary
  };
}

dashboardRouter.get('/admin', authenticateToken, requireRole(EmployeeRole.ADMIN), async (req, res) => {
  try {
    const data = await getAdminManagerDashboardData(req);
    return res.json({
      dashboard: 'admin',
      ...data
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

dashboardRouter.get('/asset-manager', authenticateToken, requireRole(EmployeeRole.ASSET_MANAGER), async (req, res) => {
  try {
    const data = await getAdminManagerDashboardData(req);
    return res.json({
      dashboard: 'asset-manager',
      ...data
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
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