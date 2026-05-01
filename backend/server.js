require("dotenv").config()

const express = require("express")
const cors = require("cors")

const prisma = require("./lib/prisma")

const projectRouter = require("./router/project.routes")
const authRouter = require("./router/authentication.routes")


const app = express()

app.use(cors())
app.use(express.json())
app.use("/projects", projectRouter)
app.use("/auth", authRouter)


const PORT = 5000
app.listen(PORT, ()=>{
    console.log(`Server running on ${PORT}`);
})