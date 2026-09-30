require("dotenv").config()
const prisma = require("../lib/prisma")
const filter = `(name IN ('Nishant_Heights', 'redisen', 'Smoke Project 663020', 'Smoke Project 662678', 'QA Project 33164543'))`

async function main() {
  const projects = await prisma.$queryRawUnsafe(`SELECT id, name FROM Project WHERE ${filter} AND active = 0`)
  console.log(`Removing ${projects.length} temporary projects:`)
  projects.forEach((p) => console.log(`- ${p.id}: ${p.name}`))
  if (!projects.length) return

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0")
    try {
      const projectIds = `(SELECT id FROM (SELECT id FROM Project WHERE ${filter} AND active = 0) p)`
      const towerIds = `(SELECT id FROM (SELECT id FROM Tower WHERE projectId IN ${projectIds}) t)`
      const floorIds = `(SELECT id FROM (SELECT id FROM FloorPlan WHERE projectId IN ${projectIds} OR towerId IN ${towerIds}) f)`
      const unitIds = `(SELECT id FROM (SELECT id FROM Unit WHERE projectId IN ${projectIds} OR towerId IN ${towerIds} OR floorId IN ${floorIds}) u)`
      const bookingIds = `(SELECT id FROM (SELECT id FROM Booking WHERE projectId IN ${projectIds} OR towerId IN ${towerIds} OR floorPlanId IN ${floorIds} OR unitId IN ${unitIds}) b)`
      for (const table of ["BookingExpense", "BookingCharge", "Demand", "Receipt", "LedgerEntry", "GeneratedDocument", "DocumentAuditLog", "CostSheet", "PaymentSchedule"]) {
        await tx.$executeRawUnsafe(`DELETE FROM ${table} WHERE bookingId IN ${bookingIds}`)
      }
      await tx.$executeRawUnsafe(`DELETE FROM Booking WHERE id IN ${bookingIds}`)
      await tx.$executeRawUnsafe(`DELETE FROM UnitModel WHERE unitId IN ${unitIds}`)
      await tx.$executeRawUnsafe(`DELETE FROM FloorPlanSlot WHERE floorPlanId IN ${floorIds} OR towerId IN ${towerIds}`)
      await tx.$executeRawUnsafe(`DELETE FROM Unit WHERE id IN ${unitIds}`)
      await tx.$executeRawUnsafe(`DELETE FROM FloorPlan WHERE id IN ${floorIds}`)
      await tx.$executeRawUnsafe(`DELETE FROM Tower WHERE id IN ${towerIds}`)
      await tx.$executeRawUnsafe(`DELETE FROM ProjectSalesUser WHERE projectId IN ${projectIds}`)
      await tx.$executeRawUnsafe(`UPDATE CallLog SET interestedProjectId = NULL WHERE interestedProjectId IN ${projectIds}`)
      await tx.$executeRawUnsafe(`DELETE FROM Project WHERE id IN ${projectIds}`)
    } finally {
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1")
    }
  })
  console.log("Temporary projects removed successfully.")
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 }).finally(() => prisma["$disconnect"]())
