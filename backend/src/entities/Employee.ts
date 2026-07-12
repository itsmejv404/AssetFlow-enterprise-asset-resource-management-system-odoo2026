import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Department } from './Department';
import { User } from './User';

export enum EmployeeRole {
  EMPLOYEE = 'employee',
  DEPARTMENT_HEAD = 'department_head',
  ASSET_MANAGER = 'asset_manager',
  ADMIN = 'admin'
}

@Entity('employees')
@Index(['employeeCode'], { unique: true })
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'employee_code',
    default: () => "('EMP-' || lpad(nextval('employee_code_seq')::text, 4, '0'))"
  })
  employeeCode!: string;

  @Column({ name: 'name' })
  name!: string;

  @OneToOne(() => User, (user) => user.employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Department, (department) => department.employees, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;

  @Column({ name: 'role', type: 'enum', enum: EmployeeRole, default: EmployeeRole.EMPLOYEE })
  role!: EmployeeRole;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'promoted_by', type: 'uuid', nullable: true })
  promotedBy?: string | null;

  @Column({ name: 'promoted_at', type: 'timestamptz', nullable: true })
  promotedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}