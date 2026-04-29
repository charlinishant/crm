require("dotenv").config()

const express = require("express")
const projectRouter = require("./router/project.routes")

const cors = require("cors")

const prisma = require("./lib/prisma")

const app = express()

app.use(cors())
app.use(express.json())
app.use("/projects", projectRouter)


const PORT = 5000
app.listen(PORT, ()=>{
    console.log(`Server running on ${PORT}`);
    console.log(`DB user :${process.env.DATABASE_USER}`);
    console.log(`url :${process.env.DATABASE_URL}`);
    
})