
const { Router } = require("express")


const { 
    createUser, 
    getUser, 
    getTelecallers,
    getUsersByRole,
    auditUserRoles,
    fixUserRoles,
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
router.get("/telecallers", optionalAuthenticate, getTelecallers)
router.get("/by-role", optionalAuthenticate, getUsersByRole)
router.get("/by-role/:role", optionalAuthenticate, getUsersByRole)
router.get("/audit-roles", optionalAuthenticate, auditUserRoles)
router.post("/fix-roles", optionalAuthenticate, fixUserRoles)
router.get("/access-panel", authenticate, getAccessPanel)
router.get("/me", authenticate, getMe)
router.patch("/me", authenticate, updateMe)

router.get("/:id", optionalAuthenticate, getUser)
router.patch("/:id", optionalAuthenticate, updateUser)
router.delete("/:id", optionalAuthenticate, deleteUser)

module.exports = router
