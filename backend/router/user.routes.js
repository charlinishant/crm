const {Router} = require("express")

const {createUser, getUser, updateUser, deleteUser} = require("../controller/user.controller")

const router = Router()

router.post("/", createUser)
router.get("/", getUser)
router.get("/:id", getUser)
router.patch("/:id", updateUser)
router.delete("/:id", deleteUser)

module.exports = router