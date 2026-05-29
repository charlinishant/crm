require("dotenv").config();

const prisma = require("../lib/prisma");

async function main() {
  const [projectCount, leadCount, userCount] = await Promise.all([
    prisma.project.count(),
    prisma.lead.count(),
    prisma.user.count(),
  ]);

  console.log("Local database connected");
  console.log(`Host: ${process.env.DATABASE_HOST || "localhost"}`);
  console.log(`Database: ${process.env.DATABASE_NAME || "(not set)"}`);
  console.log(`Projects: ${projectCount}`);
  console.log(`Leads: ${leadCount}`);
  console.log(`Users: ${userCount}`);
}

main()
  .catch((error) => {
    console.error("Local database connection failed");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
