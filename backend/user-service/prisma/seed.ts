import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始填充数据库种子数据...');

  // 创建管理员用户
  const adminPassword = await bcrypt.hash('Admin@123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@delta-terminal.com' },
    update: {},
    create: {
      email: 'admin@delta-terminal.com',
      username: 'admin',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
      emailVerified: true,
    },
  });

  console.log('✅ 创建管理员用户:', admin.email);

  // 创建管理员资料
  await prisma.userProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      bio: 'Delta Terminal 系统管理员',
      riskTolerance: 'medium',
      experience: 'expert',
    },
  });

  // 创建管理员设置
  await prisma.userSettings.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      emailNotifications: true,
      tradeNotifications: true,
      marketAlerts: true,
      systemNotifications: true,
      theme: 'dark',
      currency: 'USD',
    },
  });

  console.log('✅ 创建管理员资料和设置');

  // 创建测试用户
  const testPassword = await bcrypt.hash('Test@123456', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@delta-terminal.com' },
    update: {},
    create: {
      email: 'test@delta-terminal.com',
      username: 'testuser',
      password: testPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      isActive: true,
      isVerified: true,
      emailVerified: true,
    },
  });

  console.log('✅ 创建测试用户:', testUser.email);

  // 创建测试用户资料
  await prisma.userProfile.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      bio: '这是一个测试账户',
      country: 'China',
      city: 'Shanghai',
      riskTolerance: 'low',
      experience: 'beginner',
    },
  });

  // 创建测试用户设置
  await prisma.userSettings.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      emailNotifications: true,
      tradeNotifications: true,
      marketAlerts: false,
      systemNotifications: true,
      defaultExchange: 'binance',
      defaultTradingPair: 'BTC/USDT',
      theme: 'light',
      currency: 'CNY',
    },
  });

  console.log('✅ 创建测试用户资料和设置');

  console.log('\n🎉 数据库种子数据填充完成！');
  console.log('\n默认账户信息:');
  console.log('管理员 - Email: admin@delta-terminal.com, Password: Admin@123456');
  console.log('测试用户 - Email: test@delta-terminal.com, Password: Test@123456');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据填充失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
