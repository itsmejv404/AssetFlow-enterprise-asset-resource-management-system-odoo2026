import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';
import bcrypt from 'bcrypt';

async function resetAdmin() {
  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email: 'admin@assetflow.local' } });
  
  if (user) {
    const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
    user.passwordHash = passwordHash;
    user.isActive = true;
    await userRepo.save(user);
    console.log('✓ Password for admin@assetflow.local reset to ChangeMe123! successfully');
  } else {
    console.log('Admin user not found!');
  }
  await AppDataSource.destroy();
}

resetAdmin().catch(console.error);
