require("dotenv").config()

const express = require("express")
const cors = require("cors")

const prisma = require("./lib/prisma")

const projectRouter = require("./router/project.routes")
const authRouter = require("./router/authentication.routes")
const leadNoteRouter = require("./router/leadNote.routes")
const userRouter = require("./router/user.routes")
const teamRouter = require("./router/team.routes")

const leadRouter = require("./router/lead.routes")

const app = express()

app.use(cors())
app.use(express.json())
app.use("/projects", projectRouter)
app.use("/auth", authRouter)
app.use("/lead-notes", leadNoteRouter)
app.use("/leads", leadRouter)
app.use("/users", userRouter)
app.use("/teams", teamRouter)

const PORT = 5000
app.listen(PORT, ()=>{
    console.log(`Server running on ${PORT}`);
})
