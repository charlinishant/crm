require("dotenv").config()

const express = require("express")
const http = require("http")
const cors = require("cors")
const path = require("path")

const prisma = require("./lib/prisma")
const {initSocket} = require("./socket")
const { initializeCallbackReminders } = require("./services/callbackReminder.service")
const { initializeUnitHoldReleaseJob } = require("./services/unitHold.service")

const app = express()
const BODY_LIMIT = process.env.BODY_LIMIT || "250mb"

const server = http.createServer(app)

initSocket(server)


const projectRouter = require("./router/project.routes")
const authRouter = require("./router/authentication.routes")
const leadNoteRouter = require("./router/leadNote.routes")
const leadActivityRouter = require("./router/leadActivity.routes")
const userRouter = require("./router/user.routes")
const teamRouter = require("./router/team.routes")
const towerRouter = require("./router/tower.routes")
const floorRouter = require("./router/floorplan.routes")
const unitRouter = require("./router/unit.routes")
const bookingRouter = require("./router/booking.routes")
const taskRouter = require("./router/task.routes")
const callRouter = require("./router/call.routes")
const whatsappRouter = require("./router/whatsapp.routes")
const scheduleVisitRouter = require("./router/scheduleVisit.routes")
const attendanceRouter = require("./router/attendance.routes")
const followupRouter = require("./router/followup.routes")
const notifiactionRouter = require("./router/notification.routes")
const adminReportRouter = require("./router/adminReport.routes")
const demandRouter = require("./controller/demands")
const postSalesRouter = require("./router/postSales.routes")

const leadRouter = require("./router/lead.routes")
const emailRouetr = require("./router/email.routes")


app.use(cors({ origin: "*" }))
app.use(express.json({ limit: BODY_LIMIT }))
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }))
app.use("/uploads", express.static(path.join(__dirname, "uploads")))
app.use("/projects", projectRouter)
app.use("/auth", authRouter)
app.use("/lead-notes", leadNoteRouter)
app.use("/lead-activities", leadActivityRouter)
app.use("/leads", leadRouter)
app.use("/users", userRouter)
app.use("/teams", teamRouter)
app.use("/tower", towerRouter)
app.use("/floor", floorRouter)
app.use("/unit", unitRouter)
app.use("/bookings", bookingRouter)
app.use("/tasks", taskRouter)
app.use("/schedule-visits", scheduleVisitRouter)
app.use("/api/schedule-visits", scheduleVisitRouter)
app.use("/attendance", attendanceRouter)
app.use("/api/attendance", attendanceRouter)
app.use("/api/sales", followupRouter)
app.use("/api/admin/reports", adminReportRouter)
app.use("/calls", callRouter)
app.use("/api/calls", callRouter)
app.use("/api/whatsapp", whatsappRouter)
app.use("/api/email", emailRouetr)
app.use("/api/demands", demandRouter)
// app.use('/all-users', userRouter)
app.use("/notification", notifiactionRouter)
app.use("/post-sales", postSalesRouter)

app.use((error, req, res, next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      message: `Uploaded floor plan data is too large. Current request limit is ${BODY_LIMIT}.`,
    })
  }

  return next(error)
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`)
  initializeCallbackReminders().catch((error) => {
    console.error("Unable to initialize callback reminders:", error)
  })
  initializeUnitHoldReleaseJob()
})
