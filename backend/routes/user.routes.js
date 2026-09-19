
const { Router } = require("express")


const { 
    createUser, 
    getUser, 
    updateUser, 
    deleteUser, 
    getMe,
    updateMe,
    getAccessPanel, 
    getAllUser 
} = require("../controllers/user.controller")

const authenticate = require("../middleware/auth.middleware")
const { optionalAuthenticate, requireAdmin } = require("../middleware/auth.middleware")

const router = Router()

router.post("/", optionalAuthenticate, createUser)
router.get("/", optionalAuthenticate, getUser)
router.get("/access-panel", authenticate, getAccessPanel)
router.get("/me", authenticate, getMe)
router.patch("/me", authenticate, updateMe)

router.get("/:id", optionalAuthenticate, getUser)
router.patch("/:id", optionalAuthenticate, updateUser)
router.delete("/:id", optionalAuthenticate, deleteUser)

module.exports = router
