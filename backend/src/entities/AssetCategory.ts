import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Asset } from './Asset';

@Entity('asset_categories')
@Index(['name'], { unique: true })
export class AssetCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name' })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({
    name: 'custom_field_schema',
    type: 'jsonb',
    default: () => "'[]'::jsonb"
  })
  customFieldSchema!: Array<Record<string, unknown>>;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => Asset, (asset) => asset.category)
  assets?: Asset[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}