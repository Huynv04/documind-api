import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Departments
  const departments = ['Engineering', 'Human Resources', 'Finance', 'Customer Support'];
  const deptMap = new Map<string, string>();

  for (const name of departments) {
    const dept = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    deptMap.set(name, dept.id);
  }
  console.log(`✅ Seeded ${departments.length} departments`);

  // 2. Seed Default Admin User
  const adminPassword = await bcrypt.hash('Admin@DocuMind2026', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@documind.local' },
    update: {},
    create: {
      email: 'admin@documind.local',
      name: 'System Administrator',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Seeded Admin: ${admin.email} (Password: Admin@DocuMind2026)`);

  // 3. Seed Knowledge Manager
  const kmPassword = await bcrypt.hash('KM@DocuMind2026', 10);
  const km = await prisma.user.upsert({
    where: { email: 'hr.manager@documind.local' },
    update: {},
    create: {
      email: 'hr.manager@documind.local',
      name: 'HR Knowledge Manager',
      passwordHash: kmPassword,
      role: UserRole.KNOWLEDGE_MANAGER,
      departmentId: deptMap.get('Human Resources'),
      isActive: true,
    },
  });
  console.log(`✅ Seeded Knowledge Manager: ${km.email}`);

  // 4. Seed Employee
  const empPassword = await bcrypt.hash('User@DocuMind2026', 10);
  const emp = await prisma.user.upsert({
    where: { email: 'developer@documind.local' },
    update: {},
    create: {
      email: 'developer@documind.local',
      name: 'Backend Developer',
      passwordHash: empPassword,
      role: UserRole.EMPLOYEE,
      departmentId: deptMap.get('Engineering'),
      isActive: true,
    },
  });
  console.log(`✅ Seeded Employee: ${emp.email}`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

