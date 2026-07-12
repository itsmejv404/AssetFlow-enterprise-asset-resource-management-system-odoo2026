import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AssetCategory } from './AssetCategory';
import { Department } from './Department';
import { Employee } from './Employee';

export enum AssetStatus {
  AVAILABLE = 'available',
  ALLOCATED = 'allocated',
  RESERVED = 'reserved',
  UNDER_MAINTENANCE = 'under_maintenance',
  LOST = 'lost',
  RETIRED = 'retired',
  DISPOSED = 'disposed'
}

@Entity('assets')
@Index(['assetTag'], { unique: true })
@Index(['status'])
@Index(['category'])
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'asset_tag',
    default: () => "('AF-' || lpad(nextval('asset_tag_seq')::text, 4, '0'))"
  })
  assetTag!: string;

  @Column({ name: 'name' })
  name!: string;

  @ManyToOne(() => AssetCategory, (category) => category.assets, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: AssetCategory;

  @Column({ name: 'serial_number', type: 'text', nullable: true })
  serialNumber?: string | null;

  @Column({ name: 'acquisition_date', type: 'date', nullable: true })
  acquisitionDate?: Date | null;

  @Column({ name: 'acquisition_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  acquisitionCost?: string | null;

  @Column({ name: 'condition', type: 'text', nullable: true })
  condition?: string | null;

  @Column({ name: 'location', type: 'text', nullable: true })
  location?: string | null;

  @Column({
    name: 'category_specific_fields',
    type: 'jsonb',
    default: () => "'{}'::jsonb"
  })
  categorySpecificFields!: Record<string, unknown>;

  @Column({ name: 'is_bookable', default: false })
  isBookable!: boolean;

  @Column({ name: 'status', type: 'enum', enum: AssetStatus, default: AssetStatus.AVAILABLE })
  status!: AssetStatus;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'current_holder_employee_id' })
  currentHolderEmployee?: Employee | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'current_holder_department_id' })
  currentHolderDepartment?: Department | null;

  @Column({
    name: 'document_urls',
    type: 'jsonb',
    default: () => "'[]'::jsonb"
  })
  documentUrls!: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date | null;
}