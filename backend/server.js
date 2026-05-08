require("dotenv").config()

const express = require("express")
const cors = require("cors")

const prisma = require("./lib/prisma")

const projectRouter = require("./router/project.routes")
const authRouter = require("./router/authentication.routes")
const leadNoteRouter = require("./router/leadNote.routes")
const userRouter = require("./router/user.routes")
const teamRouter = require("./router/team.routes")
const towerRouter = require("./router/tower.routes")
const floorRouter = require("./router/floorplan.routes")
const unitRouter = require("./router/unit.routes")
const bookingRouter = require("./router/booking.routes")
const taskRouter = require("./router/task.routes")

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
app.use("/tower", towerRouter)
app.use("/floor", floorRouter)
app.use("/unit", unitRouter)
app.use("/bookings", bookingRouter)
app.use("/tasks", taskRouter)
// app.use('/all-users', userRouter)

const PORT = 5000
app.listen(PORT, ()=>{
    console.log(`Server running on ${PORT}`);
})
