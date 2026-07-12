import { app } from './app';
import { env } from './config/env';
import { AppDataSource } from './config/data-source';

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();

  // Ensure RETURN_REQUESTED is added to the allocation_status_enum type in PostgreSQL
  try {
    await AppDataSource.query(`ALTER TYPE "allocation_status_enum" ADD VALUE IF NOT EXISTS 'return_requested'`);
    await AppDataSource.query(`ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "cost" numeric(10,2)`);
    await AppDataSource.query(`ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "actual_downtime" integer`);
  } catch (err) {
    // If database type or table already has the value/columns, it might throw, so we catch it gracefully
    console.log('Checked database schema compatibility.');
  }

  app.listen(env.port, () => {
    console.log(`Express listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start AssetFlow API', error);
  process.exit(1);
});