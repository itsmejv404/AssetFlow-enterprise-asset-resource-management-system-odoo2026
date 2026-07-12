import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Department } from './Department';
import { Employee } from './Employee';
import { BookableResource } from './BookableResource';

export enum ResourceBookingStatus {
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

@Entity('resource_bookings')
@Index(['resource', 'startTime', 'endTime'])
export class ResourceBooking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BookableResource, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource!: BookableResource;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booked_by_employee_id' })
  bookedBy!: Employee;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'booked_for_department_id' })
  bookedForDepartment?: Department | null;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime!: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime!: Date;

  @Column({ name: 'status', type: 'enum', enum: ResourceBookingStatus, default: ResourceBookingStatus.UPCOMING })
  status!: ResourceBookingStatus;

  @Column({ name: 'purpose', type: 'text', nullable: true })
  purpose?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}