import { AppDataSource } from '../config/data-source';
import { Notification, NotificationType } from '../entities/Notification';
import { Employee } from '../entities/Employee';

export async function createNotification(
  recipientEmployeeId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedEntityType?: string | null,
  relatedEntityId?: string | null
): Promise<void> {
  try {
    const notifRepo = AppDataSource.getRepository(Notification);
    const employeeRepo = AppDataSource.getRepository(Employee);

    const recipient = await employeeRepo.findOne({ where: { id: recipientEmployeeId } });
    if (!recipient) {
      console.warn(`Recipient employee with ID ${recipientEmployeeId} not found. Cannot send notification.`);
      return;
    }

    const notification = notifRepo.create({
      recipient,
      type,
      title,
      message,
      relatedEntityType: relatedEntityType || null,
      relatedEntityId: relatedEntityId || null,
      isRead: false
    });

    await notifRepo.save(notification);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
