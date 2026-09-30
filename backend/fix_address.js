require('dotenv').config();
const prisma = require('./lib/prisma');

async function run() {
  await prisma.project.updateMany({
    data: {
      address: 'Charkop, Kandivali West',
      city: 'Mumbai',
      state: 'Maharashtra',
      locality: 'Charkop'
    }
  });
  console.log('Updated projects');
}

run().catch(console.error).finally(() => prisma.$disconnect());
