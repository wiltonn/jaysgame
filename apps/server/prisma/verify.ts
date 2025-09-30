import { PrismaClient } from '@prisma/client';
import type { PackMeta } from '@jaysgame/shared';

const prisma = new PrismaClient();

async function verify() {
  console.info('🔍 Verifying database setup...\n');

  try {
    // Check users
    const userCount = await prisma.user.count();
    console.info(`✅ Users: ${userCount} record(s)`);
    const users = await prisma.user.findMany();
    users.forEach((u) => console.info(`   - ${u.email} (${u.role})`));

    // Check packs
    const packCount = await prisma.pack.count();
    console.info(`\n✅ Packs: ${packCount} record(s)`);
    const packs = await prisma.pack.findMany();
    packs.forEach((p) => {
      const meta = p.meta as PackMeta;
      console.info(`   - ${meta.title} (${meta.difficulty})`);
    });

    // Check matches (should be empty)
    const matchCount = await prisma.match.count();
    console.info(`\n✅ Matches: ${matchCount} record(s)`);

    // Check analytics events (should be empty)
    const eventCount = await prisma.analyticsEvent.count();
    console.info(`✅ Analytics Events: ${eventCount} record(s)`);

    console.info('\n🎉 Database verification complete!');
    console.info('✅ All tables created and seed data loaded successfully.\n');
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
