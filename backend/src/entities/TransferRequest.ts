import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Asset } from './Asset';
import { AssetAllocation } from './AssetAllocation';
import { Department } from './Department';
import { Employee } from './Employee';

export enum TransferRequestStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed'
}

@Entity('transfer_requests')
export class TransferRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset!: Asset;

  @ManyToOne(() => AssetAllocation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'current_allocation_id' })
  currentAllocation!: AssetAllocation;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_employee_id' })
  requestedBy!: Employee;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requested_to_employee_id' })
  requestedToEmployee?: Employee | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requested_to_department_id' })
  requestedToDepartment?: Department | null;

  @Column({ name: 'status', type: 'enum', enum: TransferRequestStatus, default: TransferRequestStatus.REQUESTED })
  status!: TransferRequestStatus;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason?: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_employee_id' })
  approvedBy?: Employee | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date | null;

  @ManyToOne(() => AssetAllocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resulting_allocation_id' })
  resultingAllocation?: AssetAllocation | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}