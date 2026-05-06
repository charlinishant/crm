const {Router} = require("express")
const {createTower, getTower, updateTower, deleteTower,   listTower} = require("../controller/tower.controller")

const router = Router()

router.post("/", createTower)
router.get("/list", listTower)
router.get("/", getTower)
router.get("/:id", getTower)
router.patch("/:id", updateTower)
router.delete("/:id", deleteTower   )

module.exports = router
