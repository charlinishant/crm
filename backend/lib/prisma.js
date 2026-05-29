require("dotenv").config()

const {PrismaMariaDb} = require("@prisma/adapter-mariadb")
const {PrismaClient} = require("@prisma/client")

const adapter = new PrismaMariaDb({
    host:process.env.DATABASE_HOST,
    port:Number(process.env.DATABASE_PORT) || 3306,
    user:process.env.DATABASE_USER,
    password:process.env.DATABASE_PASSWORD,
    database:process.env.DATABASE_NAME,
    connectionLimit:5,
    allowPublicKeyRetrieval:true
})

const prisma = new PrismaClient({adapter})

module.exports = prisma
