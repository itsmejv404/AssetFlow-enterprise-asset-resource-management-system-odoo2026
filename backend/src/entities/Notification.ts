import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Employee } from './Employee';

export enum NotificationType {
  ASSET_ASSIGNED = 'asset_assigned',
  MAINTENANCE_APPROVED = 'maintenance_approved',
  MAINTENANCE_REJECTED = 'maintenance_rejected',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_REMINDER = 'booking_reminder',
  TRANSFER_APPROVED = 'transfer_approved',
  OVERDUE_RETURN = 'overdue_return',
  AUDIT_DISCREPANCY = 'audit_discrepancy'
}

@Entity('notifications')
@Index(['recipient', 'isRead'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_employee_id' })
  recipient!: Employee;

  @Column({ name: 'type', type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ name: 'title' })
  title!: string;

  @Column({ name: 'message', type: 'text' })
  message!: string;

  @Column({ name: 'related_entity_type', type: 'text', nullable: true })
  relatedEntityType?: string | null;

  @Column({ name: 'related_entity_id', type: 'uuid', nullable: true })
  relatedEntityId?: string | null;

  @Column({ name: 'is_read', default: false })
  isRead!: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}