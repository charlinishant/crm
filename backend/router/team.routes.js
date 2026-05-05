const {Router} = require("express")

const {createTeam, getTeam, updateTeam, deleteTeam} = require("../controller/team.controller")

const router = Router()

router.post("/", createTeam)
router.get("/", getTeam)
router.get("/:id", getTeam)
router.patch("/:id", updateTeam)
router.delete("/:id", deleteTeam)

module.exports = router