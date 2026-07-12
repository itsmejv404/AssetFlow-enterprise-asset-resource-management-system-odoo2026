import { AppDataSource } from '../config/data-source';
import { Department } from '../entities/Department';
import { AssetCategory } from '../entities/AssetCategory';
import { Employee } from '../entities/Employee';
import { User } from '../entities/User';
import { In, Like } from 'typeorm';

async function cleanDb() {
  await AppDataSource.initialize();

  console.log('Cleaning up database test records...');

  const employeeRepo = AppDataSource.getRepository(Employee);
  const userRepo = AppDataSource.getRepository(User);
  
  const testUsers = await userRepo.find({
    where: { email: Like('%@assetflow.local') }
  });

  const usersToDelete = testUsers.filter(u => u.email !== 'admin@assetflow.local');

  for (const user of usersToDelete) {
    const emp = await employeeRepo.findOne({ where: { user: { id: user.id } } });
    if (emp) {
      await employeeRepo.delete(emp.id);
    }
    await userRepo.delete(user.id);
  }

  const deptRepo = AppDataSource.getRepository(Department);
  const testDepts = await deptRepo.find({
    where: [
      { name: Like('Marketing%') },
      { code: Like('MKT%') }
    ],
    withDeleted: true
  });
  for (const d of testDepts) {
    await deptRepo.delete(d.id);
  }

  const categoryRepo = AppDataSource.getRepository(AssetCategory);
  const testCats = await categoryRepo.find({
    where: { name: Like('Vehicles%') }
  });
  for (const c of testCats) {
    await categoryRepo.delete(c.id);
  }

  console.log('✓ Database cleaned successfully!');
  await AppDataSource.destroy();
}

cleanDb().catch(console.error);
