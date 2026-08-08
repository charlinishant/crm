const { getIO } = require("../socket")

const emitReportsUpdate = (reason = "reports:update") => {
  try {
    getIO().emit("reports:update", {
      reason,
      emittedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Unable to emit reports:update:", error.message)
  }
}

module.exports = {
  emitReportsUpdate,
}
