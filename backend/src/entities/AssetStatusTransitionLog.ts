import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Asset } from './Asset';
import { AssetStatus } from './Asset';
import { Employee } from './Employee';

@Entity('asset_status_transition_logs')
@Index(['asset'])
export class AssetStatusTransitionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset!: Asset;

  @Column({ name: 'from_status', type: 'enum', enum: AssetStatus })
  fromStatus!: AssetStatus;

  @Column({ name: 'to_status', type: 'enum', enum: AssetStatus })
  toStatus!: AssetStatus;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason?: string | null;

  @Column({ name: 'related_entity_type', type: 'text', nullable: true })
  relatedEntityType?: string | null;

  @Column({ name: 'related_entity_id', type: 'uuid', nullable: true })
  relatedEntityId?: string | null;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'triggered_by_employee_id' })
  triggeredBy!: Employee;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}