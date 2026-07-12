import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Asset } from './Asset';

@Entity('bookable_resources')
export class BookableResource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Asset, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linked_asset_id' })
  linkedAsset?: Asset | null;

  @Column({ name: 'name' })
  name!: string;

  @Column({ name: 'location', type: 'text', nullable: true })
  location?: string | null;

  @Column({ name: 'capacity', type: 'int', nullable: true })
  capacity?: number | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}