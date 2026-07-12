import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Asset } from './Asset';
import { AuditCycle } from './AuditCycle';
import { Employee } from './Employee';

export enum AuditRecordResult {
  PENDING = 'pending',
  VERIFIED = 'verified',
  MISSING = 'missing',
  DAMAGED = 'damaged'
}

@Entity('audit_records')
@Index(['auditCycle', 'asset'], { unique: true })
export class AuditRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => AuditCycle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'audit_cycle_id' })
  auditCycle!: AuditCycle;

  @ManyToOne(() => Asset, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'asset_id' })
  asset!: Asset;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by_auditor_id' })
  verifiedByAuditor?: Employee | null;

  @Column({ name: 'result', type: 'enum', enum: AuditRecordResult, default: AuditRecordResult.PENDING })
  result!: AuditRecordResult;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date | null;

  @Column({ name: 'is_discrepancy', default: false })
  isDiscrepancy!: boolean;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'discrepancy_resolved_by_employee_id' })
  discrepancyResolvedBy?: Employee | null;

  @Column({ name: 'discrepancy_resolution_notes', type: 'text', nullable: true })
  discrepancyResolutionNotes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}