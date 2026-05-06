const {Router} = require("express")

const {createUser, getUser, updateUser, deleteUser, getAccessPanel} = require("../controller/user.controller")
const authenticate = require("../middleware/auth.middleware")

const router = Router()

router.post("/", createUser)
router.get("/", getUser)
router.get("/access-panel", authenticate, getAccessPanel)
router.get("/:id", getUser)
router.patch("/:id", updateUser)
router.delete("/:id", deleteUser)

module.exports = router
