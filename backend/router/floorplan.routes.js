const {Router} = require("express")
const {createFloor, getFloor, updateFloor, deleteFloor, listFloor} = require("../controller/floorplan.controller")

const router = Router()

router.post("/", createFloor)
router.get("/list", listFloor)
router.get("/", getFloor)
router.get("/:id", getFloor)
router.patch("/:id", updateFloor)
router.delete("/:id", deleteFloor)

module.exports = router
