import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Employee } from './Employee';

export enum DepartmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

@Entity('departments')
@Index(['name'], { unique: true })
@Index(['code'], { unique: true })
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name' })
  name!: string;

  @Column({ name: 'code' })
  code!: string;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_head_id' })
  departmentHead?: Employee | null;

  @ManyToOne(() => Department, (department) => department.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_department_id' })
  parentDepartment?: Department | null;

  @OneToMany(() => Department, (department) => department.parentDepartment)
  children?: Department[];

  @OneToMany(() => Employee, (employee) => employee.department)
  employees?: Employee[];

  @Column({ name: 'status', type: 'enum', enum: DepartmentStatus, default: DepartmentStatus.ACTIVE })
  status!: DepartmentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date | null;
}