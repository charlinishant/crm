const {Router} = require("express")
const {
  getUnit,
  updateUnit,
  updateUnitItem,
  holdUnitItem,
  releaseUnitItemHold,
  deleteUnit,
  deleteUnitItem,
  listUnit,
  createUnit,
} = require("../controller/unit.controller")

const router = Router()

router.post("/", createUnit)
router.get("/list", listUnit)
router.get("/", getUnit)
router.post("/item/:id/hold", holdUnitItem)
router.delete("/item/:id/hold", releaseUnitItemHold)
router.patch("/item/:id", updateUnitItem)
router.delete("/item/:id", deleteUnitItem)
router.get("/:id", getUnit)
router.patch("/:id", updateUnit)
router.delete("/:id", deleteUnit)

module.exports = router
