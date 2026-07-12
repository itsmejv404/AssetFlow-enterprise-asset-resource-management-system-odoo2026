import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Asset } from './Asset';
import { Employee } from './Employee';

export enum MaintenancePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum MaintenanceRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  TECHNICIAN_ASSIGNED = 'technician_assigned',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved'
}

@Entity('maintenance_requests')
@Index(['asset', 'status'])
export class MaintenanceRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset!: Asset;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'raised_by_employee_id' })
  raisedBy!: Employee;

  @Column({ name: 'issue_description', type: 'text' })
  issueDescription!: string;

  @Column({ name: 'priority', type: 'enum', enum: MaintenancePriority, default: MaintenancePriority.MEDIUM })
  priority!: MaintenancePriority;

  @Column({
    name: 'attachment_urls',
    type: 'jsonb',
    default: () => "'[]'::jsonb"
  })
  attachmentUrls!: string[];

  @Column({ name: 'status', type: 'enum', enum: MaintenanceRequestStatus, default: MaintenanceRequestStatus.PENDING })
  status!: MaintenanceRequestStatus;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_or_rejected_by_employee_id' })
  approvedOrRejectedBy?: Employee | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string | null;

  @Column({ name: 'technician_name', type: 'text', nullable: true })
  technicianName?: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}