import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Department } from './Department';
import { Employee } from './Employee';

export enum AuditCycleStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed'
}

@Entity('audit_cycles')
export class AuditCycle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name' })
  name!: string;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'scope_department_id' })
  scopeDepartment?: Department | null;

  @Column({ name: 'scope_location', type: 'text', nullable: true })
  scopeLocation?: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: Date;

  @Column({ name: 'status', type: 'enum', enum: AuditCycleStatus, default: AuditCycleStatus.PLANNED })
  status!: AuditCycleStatus;

  @ManyToMany(() => Employee)
  @JoinTable({
    name: 'audit_cycle_auditors',
    joinColumn: { name: 'audit_cycle_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'employee_id', referencedColumnName: 'id' }
  })
  auditors!: Employee[];

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_employee_id' })
  createdBy!: Employee;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closed_by_employee_id' })
  closedBy?: Employee | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}