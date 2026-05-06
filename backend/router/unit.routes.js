const {Router} = require("express")
const {createFloor, getUnit, updateUnit, deleteUnit, listUnit, createUnit} = require("../controller/unit.controller")

const router = Router()

router.post("/", createUnit)
router.get("/list", listUnit)
router.get("/", getUnit)
router.get("/:id", getUnit)
router.patch("/:id", updateUnit)
router.delete("/:id", deleteUnit)

module.exports = router
