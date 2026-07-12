import 'reflect-metadata';
import path from 'node:path';
import { DataSource } from 'typeorm';
import { env } from './env';
import {
  ActivityLog,
  Asset,
  AssetAllocation,
  AssetCategory,
  AssetStatusTransitionLog,
  AuditCycle,
  AuditRecord,
  BookableResource,
  Department,
  Employee,
  MaintenanceRequest,
  Notification,
  ResourceBooking,
  TransferRequest,
  User
} from '../entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.database.host,
  port: env.database.port,
  username: env.database.user,
  password: env.database.password,
  database: env.database.name,
  synchronize: false,
  migrationsRun: false,
  entities: [
    ActivityLog,
    Asset,
    AssetAllocation,
    AssetCategory,
    AssetStatusTransitionLog,
    AuditCycle,
    AuditRecord,
    BookableResource,
    Department,
    Employee,
    MaintenanceRequest,
    Notification,
    ResourceBooking,
    TransferRequest,
    User
  ],
  migrations: [path.resolve(__dirname, '../migrations/*.{ts,js}')],
  ssl: env.database.ssl ? { rejectUnauthorized: false } : false
});