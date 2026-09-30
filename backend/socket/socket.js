const socketModule = require("../socket")

const emitReportsUpdate = (reason = "reports:update") => {
  try {
    socketModule.getIO().emit("reports:update", {
      reason,
      emittedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Unable to emit reports:update:", error.message)
  }
}

module.exports = {
  ...socketModule,
  emitReportsUpdate,
}
