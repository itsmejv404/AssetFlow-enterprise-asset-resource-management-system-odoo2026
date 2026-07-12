import { AppDataSource } from '../config/data-source';
import { Department } from '../entities/Department';
import { AssetCategory } from '../entities/AssetCategory';
import { Asset, AssetStatus } from '../entities/Asset';
import { Employee, EmployeeRole } from '../entities/Employee';
import { User } from '../entities/User';
import { AssetAllocation, AllocationStatus } from '../entities/AssetAllocation';
import { TransferRequest, TransferRequestStatus } from '../entities/TransferRequest';
import { MaintenanceRequest, MaintenanceRequestStatus, MaintenancePriority } from '../entities/MaintenanceRequest';
import { AuditCycle, AuditCycleStatus } from '../entities/AuditCycle';
import { AuditRecord } from '../entities/AuditRecord';
import assert from 'assert';
import bcrypt from 'bcrypt';

const BASE_URL = 'http://localhost:4000/api';

async function runFullTest() {
  await AppDataSource.initialize();
  console.log('✓ Connected to database');

  const userRepo = AppDataSource.getRepository(User);
  const employeeRepo = AppDataSource.getRepository(Employee);
  const deptRepo = AppDataSource.getRepository(Department);
  const catRepo = AppDataSource.getRepository(AssetCategory);
  const assetRepo = AppDataSource.getRepository(Asset);
  const allocationRepo = AppDataSource.getRepository(AssetAllocation);
  const transferRepo = AppDataSource.getRepository(TransferRequest);
  const maintenanceRepo = AppDataSource.getRepository(MaintenanceRequest);
  const auditCycleRepo = AppDataSource.getRepository(AuditCycle);
  const auditRecordRepo = AppDataSource.getRepository(AuditRecord);

  console.log('Clearing old test data...');
  await auditRecordRepo.createQueryBuilder().delete().execute();
  await auditCycleRepo.createQueryBuilder().delete().execute();
  await maintenanceRepo.createQueryBuilder().delete().execute();
  await transferRepo.createQueryBuilder().delete().execute();
  await allocationRepo.createQueryBuilder().delete().execute();
  await assetRepo.createQueryBuilder().delete().execute();
  await catRepo.createQueryBuilder().delete().execute();
  
  const testUsers = await userRepo.find({});
  for (const u of testUsers) {
    if (u.email !== 'admin@assetflow.local') {
      const emp = await employeeRepo.findOne({ where: { user: { id: u.id } } });
      if (emp) await employeeRepo.delete(emp.id);
      await userRepo.delete(u.id);
    }
  }
  
  const testDepts = await deptRepo.find({});
  for (const d of testDepts) {
    if (d.code !== 'OPS') { 
      await deptRepo.delete(d.id);
    }
  }

  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@assetflow.local', password: 'ChangeMe123!' })
  });
  const loginData = await loginRes.json() as { token: string };
  const token = loginData.token;
  assert.ok(token, 'Login failed');
  console.log('✓ Admin authenticated via HTTP API');

  const adminEmp = await employeeRepo.findOne({ where: { user: { email: 'admin@assetflow.local' } } });
  if (!adminEmp) throw new Error('Admin employee record not found');

  const opsDept = await deptRepo.findOne({ where: { code: 'OPS' } });
  if (!opsDept) throw new Error('OPS department not found');

  console.log('\n--- Setup Base Entities ---');
  
  const catRes = await fetch(`${BASE_URL}/admin/asset-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name: 'Laptops', description: 'Office laptops', customFieldSchema: [{ key: 'ram', type: 'string' }] })
  });
  const category = await catRes.json() as AssetCategory;
  console.log('✓ Category created via API:', category.name);

  const assetRes = await fetch(`${BASE_URL}/admin/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      name: 'ThinkPad T14',
      categoryId: category.id,
      serialNumber: 'TP-1400',
      acquisitionDate: '2026-07-12',
      acquisitionCost: '1200.00',
      condition: 'New',
      location: 'HQ Floor 1',
      categorySpecificFields: { ram: '16GB' },
      isBookable: false
    })
  });
  const asset = await assetRes.json() as Asset;
  console.log('✓ Asset registered via API:', asset.name);

  const empRes = await fetch(`${BASE_URL}/admin/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Bob Employee',
      email: 'bob@assetflow.local',
      departmentId: opsDept.id,
      role: 'employee'
    })
  });
  const empData = await empRes.json() as { employee: Employee };
  const employee = empData.employee;
  console.log('✓ Employee created via API:', employee.name);

  console.log('\n--- Testing Deactivate & Reactivate Employee ---');
  const deactivateRes = await fetch(`${BASE_URL}/admin/employees/${employee.id}/deactivate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const deactivateData = await deactivateRes.json() as { employee: { isActive: boolean } };
  assert.strictEqual(deactivateData.employee.isActive, false);
  console.log('✓ Employee deactivated via API');

  const reactivateRes = await fetch(`${BASE_URL}/admin/employees/${employee.id}/reactivate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const reactivateData = await reactivateRes.json() as { employee: { isActive: boolean } };
  assert.strictEqual(reactivateData.employee.isActive, true);
  console.log('✓ Employee reactivated via API');

  console.log('\n--- Testing Change Role ---');
  const changeRoleManagerRes = await fetch(`${BASE_URL}/admin/employees/${employee.id}/change-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ role: 'asset_manager' })
  });
  const roleManagerData = await changeRoleManagerRes.json() as { employee: { role: string } };
  assert.strictEqual(roleManagerData.employee.role, 'asset_manager');
  console.log('✓ Employee role changed to Asset Manager');

  const changeRoleHeadRes = await fetch(`${BASE_URL}/admin/employees/${employee.id}/change-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ role: 'department_head', departmentId: opsDept.id })
  });
  const roleHeadData = await changeRoleHeadRes.json() as { employee: { role: string } };
  assert.strictEqual(roleHeadData.employee.role, 'department_head');
  
  const updatedDept = await deptRepo.findOne({ where: { id: opsDept.id }, relations: { departmentHead: true } });
  assert.strictEqual(updatedDept?.departmentHead?.id, employee.id);
  console.log('✓ Employee role changed to Department Head (Department Head DB updated)');

  const changeRoleEmpRes = await fetch(`${BASE_URL}/admin/employees/${employee.id}/change-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ role: 'employee' })
  });
  const roleEmpData = await changeRoleEmpRes.json() as { employee: { role: string } };
  assert.strictEqual(roleEmpData.employee.role, 'employee');

  const finalDept = await deptRepo.findOne({ where: { id: opsDept.id }, relations: { departmentHead: true } });
  assert.strictEqual(finalDept?.departmentHead, null);
  console.log('✓ Employee role changed back to Employee (Department Head DB cleared)');

  console.log('\n--- Testing Resource Allocation ---');
  const allocRes = await fetch(`${BASE_URL}/admin/allocations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      assetId: asset.id,
      employeeId: employee.id,
      expectedReturnDate: '2027-07-12'
    })
  });
  const allocation = await allocRes.json() as AssetAllocation;
  assert.strictEqual(allocation.status, AllocationStatus.ACTIVE);
  console.log('✓ Resource allocated directly to employee without approval');

  const updatedAsset = await assetRepo.findOne({ where: { id: asset.id }, relations: { currentHolderEmployee: true } });
  assert.strictEqual(updatedAsset?.status, AssetStatus.ALLOCATED);
  assert.strictEqual(updatedAsset?.currentHolderEmployee?.id, employee.id);
  console.log('✓ Database verified: asset is marked allocated to Bob');

  console.log('\n--- Testing Transfer Request Approval ---');
  const anotherDept = deptRepo.create({ name: 'Engineering', code: 'ENG' });
  await deptRepo.save(anotherDept);

  const transferReq = transferRepo.create({
    asset,
    currentAllocation: allocation,
    requestedBy: employee,
    requestedToDepartment: anotherDept,
    status: TransferRequestStatus.REQUESTED,
    reason: 'Moving to Engineering dept'
  });
  await transferRepo.save(transferReq);
  console.log('✓ Seeded pending TransferRequest to Engineering');

  const approveTransRes = await fetch(`${BASE_URL}/admin/transfers/${transferReq.id}/approve`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const approveTransData = await approveTransRes.json() as { message: string };
  console.log('✓ API Response:', approveTransData.message);

  const finalTransfer = await transferRepo.findOne({ where: { id: transferReq.id }, relations: { resultingAllocation: true } });
  assert.strictEqual(finalTransfer?.status, TransferRequestStatus.COMPLETED);
  
  const finalAsset = await assetRepo.findOne({ where: { id: asset.id }, relations: { currentHolderDepartment: true, currentHolderEmployee: true } });
  assert.strictEqual(finalAsset?.currentHolderEmployee, null);
  assert.strictEqual(finalAsset?.currentHolderDepartment?.id, anotherDept.id);
  console.log('✓ Database verified: transfer completed, asset holder is now Engineering department');

  console.log('\n--- Testing Maintenance Management ---');
  const maintenance = maintenanceRepo.create({
    asset,
    raisedBy: employee,
    issueDescription: 'Laptop screen is flickering',
    priority: MaintenancePriority.HIGH,
    status: MaintenanceRequestStatus.PENDING
  });
  await maintenanceRepo.save(maintenance);
  console.log('✓ Seeded pending MaintenanceRequest');

  const approveMaintRes = await fetch(`${BASE_URL}/admin/maintenance-requests/${maintenance.id}/approve`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const approveMaintData = await approveMaintRes.json() as { request: MaintenanceRequest };
  assert.strictEqual(approveMaintData.request.status, MaintenanceRequestStatus.APPROVED);
  console.log('✓ Maintenance request approved via API');

  const assignTechRes = await fetch(`${BASE_URL}/admin/maintenance-requests/${maintenance.id}/assign-technician`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ technicianName: 'John Tech' })
  });
  const assignTechData = await assignTechRes.json() as { request: MaintenanceRequest };
  assert.strictEqual(assignTechData.request.status, MaintenanceRequestStatus.TECHNICIAN_ASSIGNED);
  assert.strictEqual(assignTechData.request.technicianName, 'John Tech');
  console.log('✓ Technician "John Tech" assigned via API');

  console.log('\n--- Testing Audit Cycles ---');
  
  const auditRes = await fetch(`${BASE_URL}/admin/audit-cycles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Annual HQ Audit',
      scopeLocation: 'HQ Floor 1',
      startDate: '2026-07-12',
      endDate: '2026-07-20'
    })
  });
  const auditCycle = await auditRes.json() as AuditCycle;
  assert.strictEqual(auditCycle.status, AuditCycleStatus.PLANNED);
  console.log('✓ Audit cycle created via API in PLANNED status');

  const assignAuditorsRes = await fetch(`${BASE_URL}/admin/audit-cycles/${auditCycle.id}/assign-auditors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ employeeIds: [employee.id, adminEmp.id] })
  });
  const assignAuditorsData = await assignAuditorsRes.json() as { cycle: AuditCycle };
  console.log('✓ Auditors assigned successfully via API');

  finalAsset.location = 'HQ Floor 1';
  await assetRepo.save(finalAsset);

  const startAuditRes = await fetch(`${BASE_URL}/admin/audit-cycles/${auditCycle.id}/start`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const startAuditData = await startAuditRes.json() as { cycle: AuditCycle };
  assert.strictEqual(startAuditData.cycle.status, AuditCycleStatus.IN_PROGRESS);
  console.log('✓ Audit cycle started via API');

  const records = await auditRecordRepo.find({ where: { auditCycle: { id: auditCycle.id } } });
  assert.ok(records.length > 0, 'No audit records were generated');
  console.log(`✓ Database verified: ${records.length} AuditRecord(s) auto-generated for scoped assets`);

  const closeAuditRes = await fetch(`${BASE_URL}/admin/audit-cycles/${auditCycle.id}/close`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const closeAuditData = await closeAuditRes.json() as { cycle: AuditCycle };
  assert.strictEqual(closeAuditData.cycle.status, AuditCycleStatus.CLOSED);
  console.log('✓ Audit cycle closed via API');

  console.log('\n--- Centralized System Audit Logs ---');
  const logsRes = await fetch(`${BASE_URL}/admin/logs`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const logs = await logsRes.json() as any[];
  console.log(`Retrieved ${logs.length} activity log entries. Listing latest actions:`);
  logs.slice(0, 15).forEach(log => {
    const actorStr = log.actor ? `${log.actor.name} (${log.actor.role})` : 'System';
    console.log(`  - [${new Date(log.createdAt).toLocaleTimeString()}] User: ${actorStr} | Action: ${log.action} | Entity: ${log.entityType} | ID: ${log.entityId}`);
  });

  console.log('\n======================================================');
  console.log('ALL RESOURCE, MAINTENANCE & AUDIT CAPABILITIES TESTS PASSED!');
  console.log('======================================================');

  await AppDataSource.destroy();
}

runFullTest().catch(async (err) => {
  console.error('Test Failed:', err);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
