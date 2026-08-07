const prisma = require("../lib/prisma")

const releaseExpiredUnitHolds = async () => {
  const result = await prisma.unitModel.updateMany({
    where: {
      status: "Held",
      heldUntil: {
        lt: new Date(),
      },
    },
    data: {
      status: "Available",
      heldBy: null,
      heldUntil: null,
    },
  })

  return result.count
}

const initializeUnitHoldReleaseJob = () => {
  const intervalMs = Math.max(Number(process.env.UNIT_HOLD_RELEASE_INTERVAL_MS) || 60_000, 10_000)

  releaseExpiredUnitHolds().catch((error) => {
    console.error("Unable to release expired unit holds:", error)
  })

  const timer = setInterval(() => {
    releaseExpiredUnitHolds().catch((error) => {
      console.error("Unable to release expired unit holds:", error)
    })
  }, intervalMs)

  if (typeof timer.unref === "function") timer.unref()
}

module.exports = {
  releaseExpiredUnitHolds,
  initializeUnitHoldReleaseJob,
}
