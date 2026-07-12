import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`);
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS employee_code_seq START WITH 1 INCREMENT BY 1`);
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS asset_tag_seq START WITH 1 INCREMENT BY 1`);

    await queryRunner.query(`
      CREATE TYPE "employee_role_enum" AS ENUM ('employee', 'department_head', 'asset_manager', 'admin')
    `);
    await queryRunner.query(`
      CREATE TYPE "department_status_enum" AS ENUM ('active', 'inactive')
    `);
    await queryRunner.query(`
      CREATE TYPE "asset_status_enum" AS ENUM ('available', 'allocated', 'reserved', 'under_maintenance', 'lost', 'retired', 'disposed')
    `);
    await queryRunner.query(`
      CREATE TYPE "allocation_status_enum" AS ENUM ('active', 'returned', 'transferred')
    `);
    await queryRunner.query(`
      CREATE TYPE "transfer_request_status_enum" AS ENUM ('requested', 'approved', 'rejected', 'completed')
    `);
    await queryRunner.query(`
      CREATE TYPE "resource_booking_status_enum" AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "maintenance_priority_enum" AS ENUM ('low', 'medium', 'high', 'critical')
    `);
    await queryRunner.query(`
      CREATE TYPE "maintenance_request_status_enum" AS ENUM ('pending', 'approved', 'rejected', 'technician_assigned', 'in_progress', 'resolved')
    `);
    await queryRunner.query(`
      CREATE TYPE "audit_cycle_status_enum" AS ENUM ('planned', 'in_progress', 'closed')
    `);
    await queryRunner.query(`
      CREATE TYPE "audit_record_result_enum" AS ENUM ('pending', 'verified', 'missing', 'damaged')
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM ('asset_assigned', 'maintenance_approved', 'maintenance_rejected', 'booking_confirmed', 'booking_cancelled', 'booking_reminder', 'transfer_approved', 'overdue_return', 'audit_discrepancy')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "password_reset_token" character varying,
        "password_reset_expires_at" TIMESTAMP WITH TIME ZONE,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "code" character varying NOT NULL,
        "department_head_id" uuid,
        "parent_department_id" uuid,
        "status" "department_status_enum" NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_departments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_departments_name" UNIQUE ("name"),
        CONSTRAINT "UQ_departments_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "asset_categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "description" text,
        "custom_field_schema" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_categories_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_asset_categories_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "employees" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "employee_code" character varying NOT NULL DEFAULT ('EMP-' || lpad(nextval('employee_code_seq')::text, 4, '0')),
        "name" character varying NOT NULL,
        "user_id" uuid NOT NULL,
        "department_id" uuid,
        "role" "employee_role_enum" NOT NULL DEFAULT 'employee',
        "is_active" boolean NOT NULL DEFAULT true,
        "promoted_by" uuid,
        "promoted_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employees_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_employees_employee_code" UNIQUE ("employee_code"),
        CONSTRAINT "UQ_employees_user_id" UNIQUE ("user_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "assets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "asset_tag" character varying NOT NULL DEFAULT ('AF-' || lpad(nextval('asset_tag_seq')::text, 4, '0')),
        "name" character varying NOT NULL,
        "category_id" uuid NOT NULL,
        "serial_number" character varying,
        "acquisition_date" date,
        "acquisition_cost" numeric(12,2),
        "condition" text,
        "location" text,
        "category_specific_fields" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "is_bookable" boolean NOT NULL DEFAULT false,
        "status" "asset_status_enum" NOT NULL DEFAULT 'available',
        "current_holder_employee_id" uuid,
        "current_holder_department_id" uuid,
        "document_urls" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_assets_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_assets_asset_tag" UNIQUE ("asset_tag")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "asset_status_transition_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "asset_id" uuid NOT NULL,
        "from_status" "asset_status_enum" NOT NULL,
        "to_status" "asset_status_enum" NOT NULL,
        "reason" text,
        "related_entity_type" text,
        "related_entity_id" uuid,
        "triggered_by_employee_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_status_transition_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "asset_allocations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "asset_id" uuid NOT NULL,
        "allocated_to_employee_id" uuid,
        "allocated_to_department_id" uuid,
        "allocated_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "expected_return_date" TIMESTAMP WITH TIME ZONE,
        "actual_return_date" TIMESTAMP WITH TIME ZONE,
        "status" "allocation_status_enum" NOT NULL DEFAULT 'active',
        "check_in_condition_notes" text,
        "allocated_by_employee_id" uuid NOT NULL,
        "return_approved_by_employee_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_allocations_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transfer_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "asset_id" uuid NOT NULL,
        "current_allocation_id" uuid NOT NULL,
        "requested_by_employee_id" uuid NOT NULL,
        "requested_to_employee_id" uuid,
        "requested_to_department_id" uuid,
        "status" "transfer_request_status_enum" NOT NULL DEFAULT 'requested',
        "reason" text,
        "approved_by_employee_id" uuid,
        "approved_at" TIMESTAMP WITH TIME ZONE,
        "resulting_allocation_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transfer_requests_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "bookable_resources" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "linked_asset_id" uuid,
        "name" character varying NOT NULL,
        "location" text,
        "capacity" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bookable_resources_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_bookable_resources_linked_asset_id" UNIQUE ("linked_asset_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "resource_bookings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "resource_id" uuid NOT NULL,
        "booked_by_employee_id" uuid NOT NULL,
        "booked_for_department_id" uuid,
        "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" "resource_booking_status_enum" NOT NULL DEFAULT 'upcoming',
        "purpose" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resource_bookings_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "maintenance_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "asset_id" uuid NOT NULL,
        "raised_by_employee_id" uuid NOT NULL,
        "issue_description" text NOT NULL,
        "priority" "maintenance_priority_enum" NOT NULL DEFAULT 'medium',
        "attachment_urls" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "status" "maintenance_request_status_enum" NOT NULL DEFAULT 'pending',
        "approved_or_rejected_by_employee_id" uuid,
        "rejection_reason" text,
        "technician_name" text,
        "resolved_at" TIMESTAMP WITH TIME ZONE,
        "resolution_notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_maintenance_requests_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_cycles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "scope_department_id" uuid,
        "scope_location" text,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" "audit_cycle_status_enum" NOT NULL DEFAULT 'planned',
        "created_by_employee_id" uuid NOT NULL,
        "closed_at" TIMESTAMP WITH TIME ZONE,
        "closed_by_employee_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_cycles_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_cycle_auditors" (
        "audit_cycle_id" uuid NOT NULL,
        "employee_id" uuid NOT NULL,
        CONSTRAINT "PK_audit_cycle_auditors" PRIMARY KEY ("audit_cycle_id", "employee_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "audit_cycle_id" uuid NOT NULL,
        "asset_id" uuid NOT NULL,
        "verified_by_auditor_id" uuid,
        "result" "audit_record_result_enum" NOT NULL DEFAULT 'pending',
        "notes" text,
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "is_discrepancy" boolean NOT NULL DEFAULT false,
        "discrepancy_resolved_by_employee_id" uuid,
        "discrepancy_resolution_notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_records_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_audit_records_audit_cycle_asset" UNIQUE ("audit_cycle_id", "asset_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "recipient_employee_id" uuid NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "title" character varying NOT NULL,
        "message" text NOT NULL,
        "related_entity_type" text,
        "related_entity_id" uuid,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "activity_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "actor_employee_id" uuid,
        "action" character varying NOT NULL,
        "entity_type" character varying NOT NULL,
        "entity_id" uuid NOT NULL,
        "metadata" jsonb,
        "ip_address" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activity_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_assets_status" ON "assets" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_assets_category" ON "assets" ("category_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_asset_status_transition_logs_asset" ON "asset_status_transition_logs" ("asset_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_asset_allocations_asset_status" ON "asset_allocations" ("asset_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_resource_bookings_resource_start_end" ON "resource_bookings" ("resource_id", "start_time", "end_time")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_requests_asset_status" ON "maintenance_requests" ("asset_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_recipient_is_read" ON "notifications" ("recipient_employee_id", "is_read")`);
    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_actor_created_at" ON "activity_logs" ("actor_employee_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_activity_logs_entity_type_entity_id" ON "activity_logs" ("entity_type", "entity_id")`);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_employees_employee_code" ON "employees" ("employee_code")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_departments_name" ON "departments" ("name")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_departments_code" ON "departments" ("code")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_asset_categories_name" ON "asset_categories" ("name")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_assets_asset_tag" ON "assets" ("asset_tag")`);

    await queryRunner.query(`CREATE UNIQUE INDEX "one_active_allocation_per_asset" ON "asset_allocations" ("asset_id") WHERE "status" = 'active'`);
    await queryRunner.query(`
      ALTER TABLE "resource_bookings"
      ADD CONSTRAINT "no_overlapping_bookings"
      EXCLUDE USING gist (
        "resource_id" WITH =,
        tstzrange("start_time", "end_time") WITH &&
      )
      WHERE ("status" IN ('upcoming', 'ongoing'))
    `);

    await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "departments" ADD CONSTRAINT "FK_departments_department_head" FOREIGN KEY ("department_head_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "departments" ADD CONSTRAINT "FK_departments_parent_department" FOREIGN KEY ("parent_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "FK_assets_category" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "FK_assets_current_holder_employee" FOREIGN KEY ("current_holder_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "FK_assets_current_holder_department" FOREIGN KEY ("current_holder_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "asset_status_transition_logs" ADD CONSTRAINT "FK_asset_status_transition_logs_asset" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "asset_status_transition_logs" ADD CONSTRAINT "FK_asset_status_transition_logs_triggered_by" FOREIGN KEY ("triggered_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "asset_allocations" ADD CONSTRAINT "FK_asset_allocations_asset" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "asset_allocations" ADD CONSTRAINT "FK_asset_allocations_employee" FOREIGN KEY ("allocated_to_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "asset_allocations" ADD CONSTRAINT "FK_asset_allocations_department" FOREIGN KEY ("allocated_to_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "asset_allocations" ADD CONSTRAINT "FK_asset_allocations_allocated_by" FOREIGN KEY ("allocated_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "asset_allocations" ADD CONSTRAINT "FK_asset_allocations_return_approved_by" FOREIGN KEY ("return_approved_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "transfer_requests" ADD CONSTRAINT "FK_transfer_requests_asset" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" ADD CONSTRAINT "FK_transfer_requests_current_allocation" FOREIGN KEY ("current_allocation_id") REFERENCES "asset_allocations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" ADD CONSTRAINT "FK_transfer_requests_requested_by" FOREIGN KEY ("requested_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" ADD CONSTRAINT "FK_transfer_requests_requested_to_employee" FOREIGN KEY ("requested_to_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" ADD CONSTRAINT "FK_transfer_requests_requested_to_department" FOREIGN KEY ("requested_to_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" ADD CONSTRAINT "FK_transfer_requests_approved_by" FOREIGN KEY ("approved_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" ADD CONSTRAINT "FK_transfer_requests_resulting_allocation" FOREIGN KEY ("resulting_allocation_id") REFERENCES "asset_allocations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "bookable_resources" ADD CONSTRAINT "FK_bookable_resources_linked_asset" FOREIGN KEY ("linked_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "resource_bookings" ADD CONSTRAINT "FK_resource_bookings_resource" FOREIGN KEY ("resource_id") REFERENCES "bookable_resources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "resource_bookings" ADD CONSTRAINT "FK_resource_bookings_booked_by" FOREIGN KEY ("booked_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "resource_bookings" ADD CONSTRAINT "FK_resource_bookings_booked_for_department" FOREIGN KEY ("booked_for_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "maintenance_requests" ADD CONSTRAINT "FK_maintenance_requests_asset" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "maintenance_requests" ADD CONSTRAINT "FK_maintenance_requests_raised_by" FOREIGN KEY ("raised_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "maintenance_requests" ADD CONSTRAINT "FK_maintenance_requests_approved_or_rejected_by" FOREIGN KEY ("approved_or_rejected_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "audit_cycles" ADD CONSTRAINT "FK_audit_cycles_scope_department" FOREIGN KEY ("scope_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "audit_cycles" ADD CONSTRAINT "FK_audit_cycles_created_by" FOREIGN KEY ("created_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "audit_cycles" ADD CONSTRAINT "FK_audit_cycles_closed_by" FOREIGN KEY ("closed_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "audit_cycle_auditors" ADD CONSTRAINT "FK_audit_cycle_auditors_audit_cycle" FOREIGN KEY ("audit_cycle_id") REFERENCES "audit_cycles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "audit_cycle_auditors" ADD CONSTRAINT "FK_audit_cycle_auditors_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "audit_records" ADD CONSTRAINT "FK_audit_records_audit_cycle" FOREIGN KEY ("audit_cycle_id") REFERENCES "audit_cycles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "audit_records" ADD CONSTRAINT "FK_audit_records_asset" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "audit_records" ADD CONSTRAINT "FK_audit_records_verified_by" FOREIGN KEY ("verified_by_auditor_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "audit_records" ADD CONSTRAINT "FK_audit_records_discrepancy_resolved_by" FOREIGN KEY ("discrepancy_resolved_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipient_employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_activity_logs_actor" FOREIGN KEY ("actor_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "FK_activity_logs_actor"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_notifications_recipient"`);
    await queryRunner.query(`ALTER TABLE "audit_records" DROP CONSTRAINT IF EXISTS "FK_audit_records_discrepancy_resolved_by"`);
    await queryRunner.query(`ALTER TABLE "audit_records" DROP CONSTRAINT IF EXISTS "FK_audit_records_verified_by"`);
    await queryRunner.query(`ALTER TABLE "audit_records" DROP CONSTRAINT IF EXISTS "FK_audit_records_asset"`);
    await queryRunner.query(`ALTER TABLE "audit_records" DROP CONSTRAINT IF EXISTS "FK_audit_records_audit_cycle"`);
    await queryRunner.query(`ALTER TABLE "audit_cycle_auditors" DROP CONSTRAINT IF EXISTS "FK_audit_cycle_auditors_employee"`);
    await queryRunner.query(`ALTER TABLE "audit_cycle_auditors" DROP CONSTRAINT IF EXISTS "FK_audit_cycle_auditors_audit_cycle"`);
    await queryRunner.query(`ALTER TABLE "audit_cycles" DROP CONSTRAINT IF EXISTS "FK_audit_cycles_closed_by"`);
    await queryRunner.query(`ALTER TABLE "audit_cycles" DROP CONSTRAINT IF EXISTS "FK_audit_cycles_created_by"`);
    await queryRunner.query(`ALTER TABLE "audit_cycles" DROP CONSTRAINT IF EXISTS "FK_audit_cycles_scope_department"`);
    await queryRunner.query(`ALTER TABLE "maintenance_requests" DROP CONSTRAINT IF EXISTS "FK_maintenance_requests_approved_or_rejected_by"`);
    await queryRunner.query(`ALTER TABLE "maintenance_requests" DROP CONSTRAINT IF EXISTS "FK_maintenance_requests_raised_by"`);
    await queryRunner.query(`ALTER TABLE "maintenance_requests" DROP CONSTRAINT IF EXISTS "FK_maintenance_requests_asset"`);
    await queryRunner.query(`ALTER TABLE "resource_bookings" DROP CONSTRAINT IF EXISTS "FK_resource_bookings_booked_for_department"`);
    await queryRunner.query(`ALTER TABLE "resource_bookings" DROP CONSTRAINT IF EXISTS "FK_resource_bookings_booked_by"`);
    await queryRunner.query(`ALTER TABLE "resource_bookings" DROP CONSTRAINT IF EXISTS "FK_resource_bookings_resource"`);
    await queryRunner.query(`ALTER TABLE "bookable_resources" DROP CONSTRAINT IF EXISTS "FK_bookable_resources_linked_asset"`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT IF EXISTS "FK_transfer_requests_resulting_allocation"`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT IF EXISTS "FK_transfer_requests_approved_by"`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT IF EXISTS "FK_transfer_requests_requested_to_department"`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT IF EXISTS "FK_transfer_requests_requested_to_employee"`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT IF EXISTS "FK_transfer_requests_requested_by"`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT IF EXISTS "FK_transfer_requests_current_allocation"`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT IF EXISTS "FK_transfer_requests_asset"`);
    await queryRunner.query(`ALTER TABLE "asset_allocations" DROP CONSTRAINT IF EXISTS "FK_asset_allocations_return_approved_by"`);
    await queryRunner.query(`ALTER TABLE "asset_allocations" DROP CONSTRAINT IF EXISTS "FK_asset_allocations_allocated_by"`);
    await queryRunner.query(`ALTER TABLE "asset_allocations" DROP CONSTRAINT IF EXISTS "FK_asset_allocations_department"`);
    await queryRunner.query(`ALTER TABLE "asset_allocations" DROP CONSTRAINT IF EXISTS "FK_asset_allocations_employee"`);
    await queryRunner.query(`ALTER TABLE "asset_allocations" DROP CONSTRAINT IF EXISTS "FK_asset_allocations_asset"`);
    await queryRunner.query(`ALTER TABLE "asset_status_transition_logs" DROP CONSTRAINT IF EXISTS "FK_asset_status_transition_logs_triggered_by"`);
    await queryRunner.query(`ALTER TABLE "asset_status_transition_logs" DROP CONSTRAINT IF EXISTS "FK_asset_status_transition_logs_asset"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "FK_assets_current_holder_department"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "FK_assets_current_holder_employee"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "FK_assets_category"`);
    await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "FK_departments_parent_department"`);
    await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "FK_departments_department_head"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "FK_employees_department"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "FK_employees_user"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "one_active_allocation_per_asset"`);
    await queryRunner.query(`ALTER TABLE "resource_bookings" DROP CONSTRAINT IF EXISTS "no_overlapping_bookings"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_activity_logs_entity_type_entity_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_activity_logs_actor_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_recipient_is_read"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_maintenance_requests_asset_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_resource_bookings_resource_start_end"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_asset_allocations_asset_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_asset_status_transition_logs_asset"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_assets_asset_tag"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_asset_categories_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_departments_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_departments_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employees_employee_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_cycle_auditors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_cycles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "maintenance_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resource_bookings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookable_resources"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transfer_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "asset_allocations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "asset_status_transition_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "employees"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "asset_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(`DROP SEQUENCE IF EXISTS employee_code_seq`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS asset_tag_seq`);

    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_record_result_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_cycle_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "maintenance_request_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "maintenance_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "resource_booking_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transfer_request_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "allocation_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "asset_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "department_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "employee_role_enum"`);

    await queryRunner.query(`DROP EXTENSION IF EXISTS "btree_gist"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "pgcrypto"`);
  }
}