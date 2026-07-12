import { AppDataSource } from '../config/data-source';
import { ActivityLog } from '../entities/ActivityLog';
import { Employee } from '../entities/Employee';

export async function logAudit(
  actorEmployeeId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown> | null,
  ipAddress?: string | null
): Promise<void> {
  try {
    const activityLogRepo = AppDataSource.getRepository(ActivityLog);
    const employeeRepo = AppDataSource.getRepository(Employee);

    let actor: Employee | null = null;
    if (actorEmployeeId) {
      actor = await employeeRepo.findOne({ where: { id: actorEmployeeId } });
    }

    const log = activityLogRepo.create({
      actor,
      action,
      entityType,
      entityId,
      metadata,
      ipAddress
    });

    await activityLogRepo.save(log);
  } catch (error) {
    console.error('Failed to log audit activity:', error);
  }
}
