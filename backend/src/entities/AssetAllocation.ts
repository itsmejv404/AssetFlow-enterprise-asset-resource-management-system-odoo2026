import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Asset } from './Asset';
import { Department } from './Department';
import { Employee } from './Employee';

export enum AllocationStatus {
  ACTIVE = 'active',
  RETURNED = 'returned',
  TRANSFERRED = 'transferred',
  RETURN_REQUESTED = 'return_requested'
}

@Entity('asset_allocations')
@Index(['asset', 'status'])
export class AssetAllocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset!: Asset;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'allocated_to_employee_id' })
  allocatedToEmployee?: Employee | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'allocated_to_department_id' })
  allocatedToDepartment?: Department | null;

  @Column({ name: 'allocated_date', type: 'timestamptz' })
  allocatedDate!: Date;

  @Column({ name: 'expected_return_date', type: 'timestamptz', nullable: true })
  expectedReturnDate?: Date | null;

  @Column({ name: 'actual_return_date', type: 'timestamptz', nullable: true })
  actualReturnDate?: Date | null;

  @Column({ name: 'status', type: 'enum', enum: AllocationStatus, default: AllocationStatus.ACTIVE })
  status!: AllocationStatus;

  @Column({ name: 'check_in_condition_notes', type: 'text', nullable: true })
  checkInConditionNotes?: string | null;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'allocated_by_employee_id' })
  allocatedBy!: Employee;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'return_approved_by_employee_id' })
  returnApprovedBy?: Employee | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}