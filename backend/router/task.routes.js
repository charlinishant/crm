const { Router } = require("express")
const { createTask, getTasks, updateTask } = require("../controller/task.controller")
const authenticate = require("../middleware/auth.middleware")

const router = Router()

router.post("/", createTask)
router.get("/", getTasks)
router.patch("/:id", updateTask)

module.exports = router
