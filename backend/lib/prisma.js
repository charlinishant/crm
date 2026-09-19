const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const { PrismaClient } = require("@prisma/client");

const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST || "127.0.0.1",
    port: Number(process.env.DATABASE_PORT) || 3306,
    user: process.env.DATABASE_USER || "root",
    password: process.env.DATABASE_PASSWORD || "1234",
    database: process.env.DATABASE_NAME || "crm_data",
    connectionLimit: 10,
    allowPublicKeyRetrieval: true
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;
