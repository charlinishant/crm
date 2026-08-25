const prisma = require("../lib/prisma");
async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true, role: true, isActive: true }
  });
  console.log("Users in DB:", users);
}
main().finally(() => prisma.$disconnect());
