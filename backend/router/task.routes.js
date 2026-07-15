const { Router } = require("express")
const { createTask, getTasks, updateTask, deleteTask } = require("../controller/task.controller")
const authenticate = require("../middleware/auth.middleware")

const router = Router()

router.post("/", createTask)
router.get("/", getTasks)
router.patch("/:id", updateTask)
router.delete("/:id", deleteTask)

module.exports = router
