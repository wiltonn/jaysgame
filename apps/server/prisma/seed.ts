import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Starting database seed...');

  // Create a demo host user
  const passwordHash = await bcrypt.hash('password123', 10);

  const demoHost = await prisma.user.upsert({
    where: { email: 'host@jaysgame.com' },
    update: {},
    create: {
      email: 'host@jaysgame.com',
      passwordHash,
      displayName: 'Demo Host',
      role: 'HOST',
    },
  });

  console.info('✅ Created demo host:', demoHost.email);

  // Create sample pack: Toronto Blue Jays Classics
  const jaysClassicsPack = await prisma.pack.upsert({
    where: { id: 'jays-classics-pack' },
    update: {},
    create: {
      id: 'jays-classics-pack',
      ownerId: demoHost.id,
      meta: {
        sport: 'mlb',
        team: 'toronto-blue-jays',
        locale: 'en-CA',
        title: 'Jays Classics',
        difficulty: 'mixed',
        version: '1.0.0',
      },
      innings: [
        {
          theme: 'Origins',
          questions: [
            {
              type: 'mc',
              text: 'In what year did the Toronto Blue Jays play their first season?',
              choices: ['1975', '1976', '1977', '1978'],
              correctIndex: 2,
            },
          ],
        },
        {
          theme: 'Legends',
          questions: [
            {
              type: 'mc',
              text: 'Which Blue Jay hit the World Series-winning home run in 1993?',
              choices: ['Joe Carter', 'Roberto Alomar', 'Paul Molitor', 'John Olerud'],
              correctIndex: 0,
              clipUrl: 'https://www.youtube.com/watch?v=oX2dJ4K0Oew',
            },
          ],
        },
        {
          theme: 'Records',
          questions: [
            {
              type: 'closest',
              text: 'How many home runs did Jose Bautista hit in 2010?',
              correctValue: 54,
              unit: 'home runs',
            },
          ],
        },
        {
          theme: 'Championships',
          questions: [
            {
              type: 'tf',
              text: 'The Blue Jays won back-to-back World Series in 1992 and 1993.',
              correctAnswer: true,
            },
          ],
        },
        {
          theme: 'Stadiums',
          questions: [
            {
              type: 'mc',
              text: 'What was the original name of the Rogers Centre?',
              choices: ['SkyDome', 'Exhibition Stadium', 'CN Tower Arena', 'Toronto Dome'],
              correctIndex: 0,
            },
          ],
        },
        {
          theme: 'Pitchers',
          questions: [
            {
              type: 'mc',
              text: 'Which pitcher holds the Blue Jays record for career wins?',
              choices: ['Dave Stieb', 'Roy Halladay', 'Roger Clemens', 'Pat Hentgen'],
              correctIndex: 0,
            },
          ],
        },
        {
          theme: 'Modern Era',
          questions: [
            {
              type: 'mc',
              text: 'Who was named AL MVP in 2015 while playing for the Blue Jays?',
              choices: ['Josh Donaldson', 'Jose Bautista', 'Edwin Encarnacion', 'Troy Tulowitzki'],
              correctIndex: 0,
            },
          ],
        },
        {
          theme: 'Rivalries',
          questions: [
            {
              type: 'mc',
              text: 'Which team is NOT in the AL East division with the Blue Jays?',
              choices: [
                'New York Yankees',
                'Boston Red Sox',
                'Cleveland Guardians',
                'Tampa Bay Rays',
              ],
              correctIndex: 2,
            },
          ],
        },
        {
          theme: 'Grand Slam Final',
          questions: [
            {
              type: 'mc',
              text: 'How many times have the Blue Jays won the World Series?',
              choices: ['0', '1', '2', '3'],
              correctIndex: 2,
            },
          ],
        },
      ],
      tags: ['mlb', 'blue-jays', 'baseball', 'toronto'],
      isFeatured: true,
      isKidsSafe: true,
    },
  });

  console.info('✅ Created sample pack:', jaysClassicsPack.meta);

  // Create another sample pack: General Baseball Trivia
  const baseballGeneralPack = await prisma.pack.upsert({
    where: { id: 'baseball-general-pack' },
    update: {},
    create: {
      id: 'baseball-general-pack',
      ownerId: demoHost.id,
      meta: {
        sport: 'mlb',
        team: 'general',
        locale: 'en-US',
        title: 'Baseball 101',
        difficulty: 'easy',
        version: '1.0.0',
      },
      innings: [
        {
          theme: 'Basics',
          questions: [
            {
              type: 'mc',
              text: 'How many innings are in a regulation baseball game?',
              choices: ['7', '9', '11', '12'],
              correctIndex: 1,
            },
          ],
        },
        {
          theme: 'Positions',
          questions: [
            {
              type: 'mc',
              text: 'What position is typically abbreviated as "SS"?',
              choices: ['Second Base', 'Shortstop', 'Starting Pitcher', 'Switch Hitter'],
              correctIndex: 1,
            },
          ],
        },
        {
          theme: 'Rules',
          questions: [
            {
              type: 'tf',
              text: 'A batter gets four balls before walking to first base.',
              correctAnswer: true,
            },
          ],
        },
        {
          theme: 'Equipment',
          questions: [
            {
              type: 'mc',
              text: 'What color are the stitches on a regulation baseball?',
              choices: ['White', 'Black', 'Red', 'Blue'],
              correctIndex: 2,
            },
          ],
        },
        {
          theme: 'History',
          questions: [
            {
              type: 'mc',
              text: 'Who is known as "The Sultan of Swat"?',
              choices: ['Babe Ruth', 'Lou Gehrig', 'Ty Cobb', 'Jackie Robinson'],
              correctIndex: 0,
            },
          ],
        },
        {
          theme: 'Teams',
          questions: [
            {
              type: 'closest',
              text: 'How many teams are in Major League Baseball (MLB)?',
              correctValue: 30,
              unit: 'teams',
            },
          ],
        },
        {
          theme: 'Championships',
          questions: [
            {
              type: 'mc',
              text: 'What is the championship series of MLB called?',
              choices: ['Super Bowl', 'World Series', 'Stanley Cup', 'NBA Finals'],
              correctIndex: 1,
            },
          ],
        },
        {
          theme: 'Records',
          questions: [
            {
              type: 'mc',
              text: 'Which player holds the all-time home run record?',
              choices: ['Barry Bonds', 'Hank Aaron', 'Babe Ruth', 'Alex Rodriguez'],
              correctIndex: 0,
            },
          ],
        },
        {
          theme: 'Grand Slam Final',
          questions: [
            {
              type: 'mc',
              text: 'What is a home run with bases loaded called?',
              choices: ['Grand Slam', 'Triple Play', 'Home Plate', 'Perfect Game'],
              correctIndex: 0,
            },
          ],
        },
      ],
      tags: ['mlb', 'baseball', 'general', 'beginner-friendly'],
      isFeatured: true,
      isKidsSafe: true,
    },
  });

  console.info('✅ Created sample pack:', baseballGeneralPack.meta);

  console.info('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
