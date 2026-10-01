import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log(' Starting database seed...');

  // Clean existing data
  await prisma.webhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.centreTest.deleteMany();
  await prisma.diagnosticTest.deleteMany();
  await prisma.diagnosticCentre.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  const defaultPasswordHash = await bcrypt.hash('Password123', 10);

  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@eve.com',
      passwordHash: defaultPasswordHash,
      role: 'ADMIN',
    },
  });

  const normalUser = await prisma.user.create({
    data: {
      name: 'Rohit Sharma',
      email: 'rohit@example.com',
      passwordHash: defaultPasswordHash,
      role: 'USER',
    },
  });

  console.log(` Created users: Admin (${adminUser.email}), User (${normalUser.email})`);

  // 2. Create Diagnostic Centres
  const centre1 = await prisma.diagnosticCentre.create({
    data: { name: 'Apollo Diagnostic Centre', location: 'Pune' },
  });

  const centre2 = await prisma.diagnosticCentre.create({
    data: { name: 'Metropolis Healthcare', location: 'Mumbai' },
  });

  const centre3 = await prisma.diagnosticCentre.create({
    data: { name: 'SRL Diagnostics', location: 'Delhi' },
  });

  console.log(` Created 3 diagnostic centres.`);

  // 3. Create Diagnostic Tests
  const test1 = await prisma.diagnosticTest.create({
    data: { name: 'CBC', description: 'Complete Blood Count' },
  });

  const test2 = await prisma.diagnosticTest.create({
    data: { name: 'LFT', description: 'Liver Function Test' },
  });

  const test3 = await prisma.diagnosticTest.create({
    data: { name: 'KFT', description: 'Kidney Function Test' },
  });

  const test4 = await prisma.diagnosticTest.create({
    data: { name: 'Lipid Profile', description: 'Comprehensive Cholesterol Check' },
  });

  const test5 = await prisma.diagnosticTest.create({
    data: { name: 'Vitamin D Total', description: '25-Hydroxy Vitamin D Assessment' },
  });

  console.log(` Created 5 diagnostic tests.`);

  // 4. Associate Tests with Centres and set prices
  await prisma.centreTest.createMany({
    data: [
      { centreId: centre1.id, testId: test1.id, price: 500 },
      { centreId: centre1.id, testId: test2.id, price: 850 },
      { centreId: centre1.id, testId: test3.id, price: 900 },
      { centreId: centre1.id, testId: test4.id, price: 650 },

      { centreId: centre2.id, testId: test1.id, price: 450 },
      { centreId: centre2.id, testId: test2.id, price: 800 },
      { centreId: centre2.id, testId: test5.id, price: 1200 },

      { centreId: centre3.id, testId: test1.id, price: 480 },
      { centreId: centre3.id, testId: test3.id, price: 880 },
      { centreId: centre3.id, testId: test4.id, price: 600 },
      { centreId: centre3.id, testId: test5.id, price: 1150 },
    ],
  });

  console.log(` Associated tests with centres and set custom prices.`);
  console.log(' Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(' Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
